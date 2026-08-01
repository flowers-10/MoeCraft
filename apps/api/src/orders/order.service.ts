import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CheckoutQuote, OrderExportTaskView, OrderListItem, OrderStatus, OrderView, ShipmentTrackingView, ShipmentView } from "@moecraft/shared";
import { Prisma, type Shipment, type ShipmentItem } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { RequestPrincipal } from "../auth/authorization";
import { assertQuoteSignature } from "../checkout/checkout-domain";
import type { AppEnvironment } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";
import { PromotionService } from "../promotions/promotion.service";
import { ApiMetricsService } from "../observability/api-metrics.service";
import { carrierName } from "./carriers";
import type { CreateShipmentDto, OrderListQueryDto, SubmitOrderDto } from "./order.dto";
import { canApplyOrderTransition, createIdempotencyFingerprint, createOrderPaymentExpiry, createPublicOrderNumber, maskPhone, shouldReleaseCouponReservation } from "./order-domain";
import { createAutoConfirmAt, planShipmentLines, resolveFulfillmentStatus, resolveOrderShipmentStatus, ShipmentPlanError, shippedQuantities } from "./shipment-domain";
import { SandboxShipmentTrackingProvider } from "./sandbox-shipment-tracking.provider";

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  buyer: { select: { displayName: true } },
  merchantOrders: { include: { store: { select: { name: true } }, items: true, shipments: { include: { items: true }, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } },
  paymentIntent: true
});
type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type ShipmentRecord = Shipment & { items: ShipmentItem[] };
const money = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value).toFixed(2);
/** 数据域由入口决定：买家端只看自己下的单；管理端按平台/商家角色限定，避免双角色用户被误判为纯买家。 */
export type OrderAccessScope = "buyer" | "admin";

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionService,
    private readonly config: ConfigService<AppEnvironment, true>,
    private readonly tracking: SandboxShipmentTrackingProvider = new SandboxShipmentTrackingProvider(),
    private readonly metrics: ApiMetricsService = new ApiMetricsService()
  ) {}

  async create(userId: string, idempotencyKey: string | undefined, dto: SubmitOrderDto): Promise<OrderView> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 100) throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED");
    const requestHash = createIdempotencyFingerprint(dto.quoteId, dto.signature);
    const existing = await this.prisma.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: orderInclude });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ConflictException("IDEMPOTENCY_KEY_CONFLICT");
      return this.view(existing);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.checkoutQuote.findFirst({ where: { id: dto.quoteId, userId } });
        if (!row) throw new NotFoundException("CHECKOUT_QUOTE_NOT_FOUND");
        if (row.consumedAt) throw new ConflictException("CHECKOUT_QUOTE_CONSUMED");
        if (row.expiresAt <= new Date()) throw new ConflictException("CHECKOUT_QUOTE_EXPIRED");
        const signatureInput = { quoteId: row.id, userId, version: row.version, expiresAt: row.expiresAt.toISOString(), payableAmount: money(row.payableAmount) };
        if (dto.signature !== row.signature || !assertQuoteSignature(signatureInput, dto.signature, this.config.get("JWT_ACCESS_SECRET", { infer: true }))) {
          throw new ConflictException("CHECKOUT_QUOTE_SIGNATURE_INVALID");
        }
        const quote = row.snapshot as unknown as CheckoutQuote;
        if (!quote.valid || quote.invalidCount) throw new ConflictException("CHECKOUT_QUOTE_INVALID");
        const quoteItems = quote.groups.flatMap((group) => group.items);
        const skus = await tx.sku.findMany({
          where: { id: { in: quoteItems.map((item) => item.skuId) } },
          include: { inventory: true, product: { include: { store: { include: { merchant: true } } } } }
        });
        const skuMap = new Map(skus.map((sku) => [sku.id, sku]));
        for (const item of quoteItems) {
          const sku = skuMap.get(item.skuId);
          if (!sku || !sku.isActive || sku.product.status !== "ACTIVE" || !sku.product.store.isOpen || sku.product.store.merchant.status !== "ACTIVE") {
            throw new ConflictException("ORDER_SELLABILITY_CHANGED");
          }
          const available = sku.inventory ? sku.inventory.onHand - sku.inventory.reserved : 0;
          if (available < item.quantity) throw new ConflictException("ORDER_INVENTORY_CHANGED");
          if (sku.purchaseLimit && item.quantity > sku.purchaseLimit) throw new ConflictException("ORDER_PURCHASE_LIMIT_CHANGED");
          if (money(sku.priceAmount) !== item.unitPrice) throw new ConflictException("ORDER_PRICE_CHANGED");
        }
        const orderId = randomUUID();
        const orderExpiresAt = createOrderPaymentExpiry();
        await tx.order.create({
          data: {
            id: orderId, orderNumber: createPublicOrderNumber(), userId, quoteId: quote.id,
            idempotencyKey: key, requestHash, status: "PENDING_PAYMENT", currency: quote.currency,
            originalAmount: new Prisma.Decimal(quote.originalAmount), shippingAmount: new Prisma.Decimal(quote.shippingAmount),
            discountAmount: new Prisma.Decimal(quote.discountAmount), payableAmount: new Prisma.Decimal(quote.payableAmount),
            addressSnapshot: quote.address as unknown as Prisma.InputJsonValue, couponCode: quote.couponCode, expiresAt: orderExpiresAt
          }
        });
        for (const group of quote.groups) {
          const child = await tx.merchantOrder.create({
            data: {
              orderId, merchantId: group.merchantId, storeId: group.storeId, status: "PENDING_PAYMENT", currency: quote.currency,
              originalAmount: new Prisma.Decimal(group.originalAmount), shippingAmount: new Prisma.Decimal(group.shippingAmount),
              discountAmount: new Prisma.Decimal(group.discountAmount), payableAmount: new Prisma.Decimal(group.payableAmount)
            }
          });
          for (const snapshot of group.items) {
            const sku = skuMap.get(snapshot.skuId)!;
            const inventory = sku.inventory!;
            const itemId = randomUUID();
            await tx.orderItem.create({
              data: {
                id: itemId, orderId, merchantOrderId: child.id, storeId: group.storeId,
                productId: snapshot.productId, skuId: snapshot.skuId, productTitle: snapshot.productTitle,
                skuName: snapshot.skuName, coverFileId: snapshot.coverFileId, quantity: snapshot.quantity,
                currency: snapshot.currency, unitPrice: new Prisma.Decimal(snapshot.unitPrice),
                originalAmount: new Prisma.Decimal(snapshot.originalAmount), discountAmount: new Prisma.Decimal(snapshot.discountAmount),
                payableAmount: new Prisma.Decimal(snapshot.payableAmount), pricingSnapshot: snapshot as unknown as Prisma.InputJsonValue
              }
            });
            const changed = await tx.inventory.updateMany({
              where: { id: inventory.id, version: inventory.version, onHand: inventory.onHand, reserved: inventory.reserved },
              data: { reserved: { increment: snapshot.quantity }, version: { increment: 1 } }
            });
            if (!changed.count){this.metrics.recordCommerce("inventory_lock_failure");throw new ConflictException("ORDER_INVENTORY_CONFLICT");}
            await tx.inventoryLedgerEntry.create({
              data: { inventoryId: inventory.id, type: "RESERVATION_CREATED", onHandDelta: 0, reservedDelta: snapshot.quantity,
                onHandAfter: inventory.onHand, reservedAfter: inventory.reserved + snapshot.quantity, reason: "订单创建锁定库存",
                referenceType: "ORDER_ITEM", referenceId: itemId }
            });
            await tx.inventoryReservation.create({ data: { inventoryId: inventory.id, referenceId: itemId, quantity: snapshot.quantity, expiresAt: orderExpiresAt } });
            inventory.reserved += snapshot.quantity;
            inventory.version += 1;
          }
        }
        if (quote.couponCode) {
          const redemption = await this.promotions.redeemForOrder(tx, userId, orderId, {
            items: quoteItems.map((item) => ({ skuId: item.skuId, quantity: item.quantity })), couponCode: quote.couponCode
          });
          if (money(redemption.discountAmount) !== quote.discountAmount) throw new ConflictException("ORDER_COUPON_CHANGED");
        }
        await tx.paymentIntent.create({ data: { orderId, status: "PENDING", provider: "SANDBOX", amount: new Prisma.Decimal(quote.payableAmount), currency: quote.currency, expiresAt: orderExpiresAt } });
        await tx.job.create({data:{type:"CLOSE_EXPIRED_ORDER",uniqueKey:`close-order:${orderId}`,payload:{orderId},runAt:orderExpiresAt}});
        await tx.orderEvent.create({ data: { orderId, actorId: userId, toStatus: "PENDING_PAYMENT", type: "CREATED" } });
        const consumed = await tx.checkoutQuote.updateMany({ where: { id: quote.id, consumedAt: null }, data: { consumedAt: new Date() } });
        if (!consumed.count) throw new ConflictException("CHECKOUT_QUOTE_CONSUMED");
        const result=this.view(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }));
        this.metrics.recordCommerce("order_create_success");
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await this.prisma.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: orderInclude });
        if (raced?.requestHash === requestHash) return this.view(raced);
        throw new ConflictException("IDEMPOTENCY_KEY_CONFLICT");
      }
      this.metrics.recordCommerce("order_create_failure");
      throw error;
    }
  }

  async list(principal: RequestPrincipal, query: OrderListQueryDto, scope: OrderAccessScope): Promise<OrderListItem[]> {
    const where: Prisma.OrderWhereInput = query.status ? { status: query.status } : {};
    const merchantScope = scope === "buyer" ? null : this.resolveMerchantScope(principal);
    if (scope === "buyer") where.userId = principal.sub;
    else if (merchantScope) where.merchantOrders = { some: { merchantId: merchantScope } };
    if (query.search?.trim()) where.orderNumber = { contains: query.search.trim() };
    const rows = await this.prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((row) => {
      const value = this.view(row, merchantScope);
      const { address: _address, merchantOrders, ...base } = value;
      return { ...base, storeNames: merchantOrders.map((child) => child.storeName), itemCount: merchantOrders.flatMap((child) => child.items).reduce((sum,item)=>sum+item.quantity,0) };
    });
  }

  async get(principal:RequestPrincipal,id:string,scope:OrderAccessScope):Promise<OrderView>{
    const merchantScope=scope==="admin"?this.resolveMerchantScope(principal):null;
    const row=await this.prisma.order.findUnique({where:{id},include:orderInclude});
    if(!row||!this.canRead(principal,row,scope,merchantScope))throw new NotFoundException("ORDER_NOT_FOUND");
    const value=this.view(row,merchantScope);
    if(scope==="admin")value.address={...value.address,phone:maskPhone(value.address.phone)};
    return value;
  }

  async addMerchantNote(principal:RequestPrincipal,orderId:string,merchantOrderId:string,note:string):Promise<OrderView>{
    if(!principal.merchantId)throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
    const child=await this.prisma.merchantOrder.findFirst({where:{id:merchantOrderId,orderId,merchantId:principal.merchantId}});
    if(!child)throw new NotFoundException("MERCHANT_ORDER_NOT_FOUND");
    await this.prisma.merchantOrder.update({where:{id:merchantOrderId},data:{merchantNote:note.trim()}});
    await this.prisma.auditLog.create({data:{actorId:principal.sub,action:"order.merchant_note.updated",targetType:"MerchantOrder",targetId:merchantOrderId}});
    return this.get(principal,orderId,"admin");
  }

  async createExport(principal:RequestPrincipal,query:OrderListQueryDto):Promise<OrderExportTaskView>{
    const merchantId=principal.roles.some((role)=>role==="MERCHANT_OWNER"||role==="MERCHANT_STAFF")?principal.merchantId:null;
    if(!merchantId&&!principal.roles.some((role)=>role==="PLATFORM_ADMIN"||role==="PLATFORM_OPERATOR"))throw new ForbiddenException("PERMISSION_DENIED");
    const task=await this.prisma.orderExportTask.create({data:{requesterId:principal.sub,merchantId,filters:{status:query.status??null,search:query.search??null}}});
    setImmediate(()=>{void this.runExport(task.id,principal,query);});
    return{id:task.id,status:"PENDING",downloadName:null,createdAt:task.createdAt.toISOString(),completedAt:null,error:null};
  }

  private async runExport(id:string,principal:RequestPrincipal,query:OrderListQueryDto){
    try{
      await this.prisma.orderExportTask.update({where:{id},data:{status:"PROCESSING"}});
      const rows=await this.list(principal,query,"admin");
      const escape=(value:string)=>`"${value.replaceAll('"','""')}"`;
      const csv=["orderNumber,status,stores,itemCount,amount,currency,createdAt",...rows.map((row)=>[row.orderNumber,row.status,row.storeNames.join(" / "),String(row.itemCount),row.payableAmount,row.currency,row.createdAt].map(escape).join(","))].join("\r\n");
      await this.prisma.orderExportTask.update({where:{id},data:{status:"COMPLETED",downloadName:`orders-${id}.csv`,resultCsv:csv,completedAt:new Date()}});
    }catch(error){
      await this.prisma.orderExportTask.update({where:{id},data:{status:"FAILED",errorMessage:error instanceof Error?error.message:"EXPORT_FAILED",completedAt:new Date()}});
    }
  }

  async cancel(userId:string,id:string):Promise<OrderView>{
    return this.prisma.$transaction(async(tx)=>{
      const order=await tx.order.findFirst({where:{id,userId},include:orderInclude});
      if(!order)throw new NotFoundException("ORDER_NOT_FOUND");
      if(order.status==="CANCELLED")return this.view(order);
      if(!canApplyOrderTransition(order.status,"CANCELLED"))throw new ConflictException("ORDER_STATUS_CONFLICT");
      await this.releaseReservations(tx,order.id,"买家取消订单");
      if(shouldReleaseCouponReservation(order.status,"CANCELLED"))await tx.couponRedemption.deleteMany({where:{orderId:id}});
      await tx.paymentIntent.update({where:{orderId:id},data:{status:"CANCELLED",closedAt:new Date()}});
      await tx.merchantOrder.updateMany({where:{orderId:id},data:{status:"CANCELLED"}});
      await tx.order.update({where:{id},data:{status:"CANCELLED",cancelledAt:new Date()}});
      await tx.orderEvent.create({data:{orderId:id,actorId:userId,fromStatus:order.status,toStatus:"CANCELLED",type:"BUYER_CANCELLED"}});
      return this.view(await tx.order.findUniqueOrThrow({where:{id},include:orderInclude}));
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  async confirmReceipt(userId:string,id:string):Promise<OrderView>{
    return this.prisma.$transaction(async(tx)=>{
      const order=await tx.order.findFirst({where:{id,userId},include:orderInclude});
      if(!order)throw new NotFoundException("ORDER_NOT_FOUND");
      if(order.status==="COMPLETED")return this.view(order);
      if(!canApplyOrderTransition(order.status,"COMPLETED"))throw new ConflictException("ORDER_STATUS_CONFLICT");
      await tx.merchantOrder.updateMany({where:{orderId:id},data:{status:"COMPLETED"}});
      await tx.order.update({where:{id},data:{status:"COMPLETED",completedAt:new Date()}});
      await tx.orderEvent.create({data:{orderId:id,actorId:userId,fromStatus:order.status,toStatus:"COMPLETED",type:"BUYER_CONFIRMED"}});
      return this.view(await tx.order.findUniqueOrThrow({where:{id},include:orderInclude}));
    });
  }

  /** 商家手工发货：复核订单/支付状态，支持一个子单多包裹与部分发货，全程审计。 */
  async ship(principal:RequestPrincipal,orderId:string,merchantOrderId:string,dto:CreateShipmentDto):Promise<OrderView>{
    if(!principal.merchantId)throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
    const trackingNumber=dto.trackingNumber.trim().toUpperCase();
    return this.prisma.$transaction(async(tx)=>{
      const order=await tx.order.findUnique({where:{id:orderId},include:orderInclude});
      const child=order?.merchantOrders.find((item)=>item.id===merchantOrderId&&item.merchantId===principal.merchantId);
      if(!order||!child)throw new NotFoundException("MERCHANT_ORDER_NOT_FOUND");
      if(!["PAID","PARTIALLY_SHIPPED"].includes(order.status)||!["PAID","PARTIALLY_SHIPPED"].includes(child.status))throw new ConflictException("ORDER_STATUS_CONFLICT");
      if(order.paymentIntent?.status!=="SUCCEEDED")throw new ConflictException("ORDER_NOT_PAID");
      let planned:Map<string,number>;
      try{
        planned=planShipmentLines(child.items,shippedQuantities(child.shipments),dto.items);
      }catch(error){
        if(error instanceof ShipmentPlanError)throw new BadRequestException(error.code);
        throw error;
      }
      const lines=[...planned];
      const duplicate=child.shipments.find((shipment)=>shipment.carrier===dto.carrier&&shipment.trackingNumber===trackingNumber);
      if(duplicate){
        const existing=duplicate.items.map((item):[string,number]=>[item.orderItemId,item.quantity]).sort();
        const requested=lines.map(([orderItemId,quantity]):[string,number]=>[orderItemId,quantity]).sort();
        if(JSON.stringify(existing)!==JSON.stringify(requested))throw new ConflictException("SHIPMENT_TRACKING_CONFLICT");
        return this.view(order,principal.merchantId);
      }
      const shipment=await tx.shipment.create({data:{merchantOrderId:child.id,carrier:dto.carrier,trackingNumber,note:dto.note?.trim()||null,createdBy:principal.sub,items:{create:lines.map(([orderItemId,quantity])=>({orderItemId,quantity}))}}});
      const nextShipped=shippedQuantities(child.shipments);
      for(const[orderItemId,quantity]of lines)nextShipped.set(orderItemId,(nextShipped.get(orderItemId)??0)+quantity);
      const previousStatus=order.status as OrderStatus;
      const childStatus=resolveFulfillmentStatus(child.items,nextShipped);
      if(childStatus!==child.status){
        if(!canApplyOrderTransition(child.status as OrderStatus,childStatus))throw new ConflictException("ORDER_STATUS_CONFLICT");
        await tx.merchantOrder.update({where:{id:child.id},data:{status:childStatus}});
      }
      const siblings=order.merchantOrders.map((item)=>({status:(item.id===child.id?childStatus:item.status) as OrderStatus}));
      const orderStatus=resolveOrderShipmentStatus(siblings);
      if(orderStatus!==previousStatus){
        if(!canApplyOrderTransition(previousStatus,orderStatus))throw new ConflictException("ORDER_STATUS_CONFLICT");
        await tx.order.update({where:{id:order.id},data:{status:orderStatus}});
      }
      await tx.orderEvent.create({data:{orderId:order.id,actorId:principal.sub,fromStatus:previousStatus,toStatus:orderStatus,type:"SHIPMENT_CREATED",metadata:{shipmentId:shipment.id,merchantOrderId:child.id,carrier:dto.carrier,trackingNumber,items:lines.map(([orderItemId,quantity])=>({orderItemId,quantity}))}}});
      if(orderStatus==="SHIPPED"&&previousStatus!=="SHIPPED"){
        await tx.job.create({data:{type:"AUTO_CONFIRM_RECEIPT",uniqueKey:`auto-confirm:${order.id}`,payload:{orderId:order.id},runAt:createAutoConfirmAt(new Date(),this.config.get("ORDER_AUTO_CONFIRM_DAYS",{infer:true}))}});
      }
      await tx.auditLog.create({data:{actorId:principal.sub,action:"order.shipment.created",targetType:"MerchantOrder",targetId:child.id,metadata:{shipmentId:shipment.id,carrier:dto.carrier,trackingNumber,note:dto.note?.trim()||null,items:lines.map(([orderItemId,quantity])=>({orderItemId,quantity}))}}});
      this.metrics.recordCommerce("shipment_created");
      return this.view(await tx.order.findUniqueOrThrow({where:{id:order.id},include:orderInclude}),principal.merchantId);
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  async trackingForBuyer(userId:string,orderId:string):Promise<ShipmentTrackingView[]>{
    const order=await this.prisma.order.findFirst({where:{id:orderId,userId},include:{merchantOrders:{include:{shipments:{include:{items:true},orderBy:{createdAt:"asc"}}}}}});
    if(!order)throw new NotFoundException("ORDER_NOT_FOUND");
    return this.withTracking(order.merchantOrders.flatMap((child)=>child.shipments));
  }

  async trackingForAdmin(principal:RequestPrincipal,orderId:string):Promise<ShipmentTrackingView[]>{
    const merchantScope=this.resolveMerchantScope(principal);
    const order=await this.prisma.order.findUnique({where:{id:orderId},include:{merchantOrders:{include:{shipments:{include:{items:true},orderBy:{createdAt:"asc"}}}}}});
    if(!order||(merchantScope&&!order.merchantOrders.some((child)=>child.merchantId===merchantScope)))throw new NotFoundException("ORDER_NOT_FOUND");
    return this.withTracking(order.merchantOrders.filter((child)=>!merchantScope||child.merchantId===merchantScope).flatMap((child)=>child.shipments));
  }

  private async withTracking(shipments:ShipmentRecord[]):Promise<ShipmentTrackingView[]>{
    const views:ShipmentTrackingView[]=[];
    for(const shipment of shipments){
      const events=await this.tracking.track({carrier:shipment.carrier,trackingNumber:shipment.trackingNumber,shippedAt:shipment.shippedAt});
      if(shipment.status!=="DELIVERED"&&events.some((event)=>event.status==="DELIVERED")){
        await this.prisma.shipment.update({where:{id:shipment.id},data:{status:"DELIVERED",deliveredAt:new Date()}});
        shipment.status="DELIVERED";
      }
      views.push({...this.shipmentView(shipment),events});
    }
    return views;
  }

  private shipmentView(shipment:ShipmentRecord):ShipmentView{
    return{id:shipment.id,merchantOrderId:shipment.merchantOrderId,carrier:shipment.carrier,carrierName:carrierName(shipment.carrier),trackingNumber:shipment.trackingNumber,status:shipment.status,note:shipment.note,shippedAt:shipment.shippedAt.toISOString(),deliveredAt:shipment.deliveredAt?.toISOString()??null,items:shipment.items.map((item)=>({id:item.id,orderItemId:item.orderItemId,quantity:item.quantity}))};
  }

  private async releaseReservations(tx:Prisma.TransactionClient,orderId:string,reason:string){
    const items=await tx.orderItem.findMany({where:{orderId},select:{id:true}});
    const reservations=await tx.inventoryReservation.findMany({where:{referenceId:{in:items.map((item)=>item.id)},status:"ACTIVE"},include:{inventory:true}});
    for(const reservation of reservations){
      const changed=await tx.inventory.updateMany({where:{id:reservation.inventoryId,version:reservation.inventory.version},data:{reserved:{decrement:reservation.quantity},version:{increment:1}}});
      if(!changed.count)throw new ConflictException("ORDER_INVENTORY_CONFLICT");
      await tx.inventoryLedgerEntry.create({data:{inventoryId:reservation.inventoryId,type:"RESERVATION_RELEASED",onHandDelta:0,reservedDelta:-reservation.quantity,onHandAfter:reservation.inventory.onHand,reservedAfter:reservation.inventory.reserved-reservation.quantity,reason,referenceType:"ORDER_ITEM",referenceId:reservation.referenceId}});
      await tx.inventoryReservation.update({where:{id:reservation.id},data:{status:"RELEASED",releasedAt:new Date(),releaseReason:reason}});
    }
  }

  /** 管理端数据域：平台角色返回 null（全量）；商家角色返回其 merchantId；其余拒绝。 */
  private resolveMerchantScope(principal:RequestPrincipal):string|null{
    if(principal.roles.some((role)=>role==="PLATFORM_ADMIN"||role==="PLATFORM_OPERATOR"))return null;
    if(principal.roles.some((role)=>role==="MERCHANT_OWNER"||role==="MERCHANT_STAFF")){
      if(!principal.merchantId)throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
      return principal.merchantId;
    }
    throw new ForbiddenException("PERMISSION_DENIED");
  }

  private canRead(principal:RequestPrincipal,order:OrderRecord,scope:OrderAccessScope,merchantScope:string|null){
    if(scope==="buyer")return order.userId===principal.sub;
    if(merchantScope)return order.merchantOrders.some((child)=>child.merchantId===merchantScope);
    return true;
  }

  private view(order:OrderRecord,merchantScope?:string|null):OrderView{
    const address=order.addressSnapshot as unknown as OrderView["address"];
    const children=merchantScope?order.merchantOrders.filter((child)=>child.merchantId===merchantScope):order.merchantOrders;
    return {
      id:order.id,orderNumber:order.orderNumber,userId:order.userId,buyerDisplayName:order.buyer.displayName,buyerMaskedPhone:maskPhone(address.phone),
      status:order.status as OrderStatus,currency:order.currency,originalAmount:money(order.originalAmount),shippingAmount:money(order.shippingAmount),
      discountAmount:money(order.discountAmount),payableAmount:money(order.payableAmount),address,
      merchantOrders:children.map((child)=>({id:child.id,merchantId:child.merchantId,storeId:child.storeId,storeName:child.store.name,status:child.status as OrderStatus,
        originalAmount:money(child.originalAmount),shippingAmount:money(child.shippingAmount),discountAmount:money(child.discountAmount),payableAmount:money(child.payableAmount),merchantNote:child.merchantNote,
        items:child.items.map((item)=>({id:item.id,merchantOrderId:item.merchantOrderId,storeId:item.storeId,skuId:item.skuId,productId:item.productId,productTitle:item.productTitle,
          skuName:item.skuName,coverFileId:item.coverFileId,quantity:item.quantity,currency:item.currency,unitPrice:money(item.unitPrice),originalAmount:money(item.originalAmount),
          discountAmount:money(item.discountAmount),payableAmount:money(item.payableAmount)})),
        shipments:child.shipments.map((shipment)=>this.shipmentView(shipment)),
        shippable:Boolean(merchantScope&&child.merchantId===merchantScope&&["PAID","PARTIALLY_SHIPPED"].includes(child.status))})),
      payment:{id:order.paymentIntent!.id,status:order.paymentIntent!.status,provider:order.paymentIntent!.provider,amount:money(order.paymentIntent!.amount),currency:order.paymentIntent!.currency,expiresAt:order.paymentIntent!.expiresAt.toISOString()},
      createdAt:order.createdAt.toISOString(),updatedAt:order.updatedAt.toISOString()
    };
  }
}
