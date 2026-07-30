import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CheckoutQuote, OrderExportTaskView, OrderListItem, OrderStatus, OrderView } from "@moecraft/shared";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { RequestPrincipal } from "../auth/authorization";
import { assertQuoteSignature } from "../checkout/checkout-domain";
import type { AppEnvironment } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";
import { PromotionService } from "../promotions/promotion.service";
import type { OrderListQueryDto, SubmitOrderDto } from "./order.dto";
import { canApplyOrderTransition, createIdempotencyFingerprint, createPublicOrderNumber, maskPhone } from "./order-domain";

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  buyer: { select: { displayName: true } },
  merchantOrders: { include: { store: { select: { name: true } }, items: true }, orderBy: { createdAt: "asc" } },
  paymentIntent: true
});
type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
const money = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value).toFixed(2);

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionService,
    private readonly config: ConfigService<AppEnvironment, true>
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
        await tx.order.create({
          data: {
            id: orderId, orderNumber: createPublicOrderNumber(), userId, quoteId: quote.id,
            idempotencyKey: key, requestHash, status: "PENDING_PAYMENT", currency: quote.currency,
            originalAmount: new Prisma.Decimal(quote.originalAmount), shippingAmount: new Prisma.Decimal(quote.shippingAmount),
            discountAmount: new Prisma.Decimal(quote.discountAmount), payableAmount: new Prisma.Decimal(quote.payableAmount),
            addressSnapshot: quote.address as unknown as Prisma.InputJsonValue, couponCode: quote.couponCode, expiresAt: row.expiresAt
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
            if (!changed.count) throw new ConflictException("ORDER_INVENTORY_CONFLICT");
            await tx.inventoryLedgerEntry.create({
              data: { inventoryId: inventory.id, type: "RESERVATION_CREATED", onHandDelta: 0, reservedDelta: snapshot.quantity,
                onHandAfter: inventory.onHand, reservedAfter: inventory.reserved + snapshot.quantity, reason: "订单创建锁定库存",
                referenceType: "ORDER_ITEM", referenceId: itemId }
            });
            await tx.inventoryReservation.create({ data: { inventoryId: inventory.id, referenceId: itemId, quantity: snapshot.quantity, expiresAt: row.expiresAt } });
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
        await tx.paymentIntent.create({ data: { orderId, status: "PENDING", provider: "SANDBOX", amount: new Prisma.Decimal(quote.payableAmount), currency: quote.currency, expiresAt: row.expiresAt } });
        await tx.orderEvent.create({ data: { orderId, actorId: userId, toStatus: "PENDING_PAYMENT", type: "CREATED" } });
        const consumed = await tx.checkoutQuote.updateMany({ where: { id: quote.id, consumedAt: null }, data: { consumedAt: new Date() } });
        if (!consumed.count) throw new ConflictException("CHECKOUT_QUOTE_CONSUMED");
        await tx.cartItem.deleteMany({ where: { id: { in: quoteItems.map((item) => item.cartItemId) }, cart: { userId } } });
        return this.view(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }));
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await this.prisma.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: orderInclude });
        if (raced?.requestHash === requestHash) return this.view(raced);
        throw new ConflictException("IDEMPOTENCY_KEY_CONFLICT");
      }
      throw error;
    }
  }

  async list(principal: RequestPrincipal, query: OrderListQueryDto): Promise<OrderListItem[]> {
    const where: Prisma.OrderWhereInput = query.status ? { status: query.status } : {};
    if (principal.roles.includes("CUSTOMER")) where.userId = principal.sub;
    else if (principal.roles.includes("MERCHANT_OWNER") || principal.roles.includes("MERCHANT_STAFF")) {
      if (!principal.merchantId) throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
      where.merchantOrders = { some: { merchantId: principal.merchantId } };
    } else if (!principal.roles.some((role) => role === "PLATFORM_ADMIN" || role === "PLATFORM_OPERATOR")) throw new ForbiddenException("PERMISSION_DENIED");
    if (query.search?.trim()) where.orderNumber = { contains: query.search.trim() };
    const rows = await this.prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((row) => {
      const value = this.view(row);
      const { address: _address, merchantOrders, ...base } = value;
      return { ...base, storeNames: merchantOrders.map((child) => child.storeName), itemCount: merchantOrders.flatMap((child) => child.items).reduce((sum,item)=>sum+item.quantity,0) };
    });
  }

  async get(principal:RequestPrincipal,id:string):Promise<OrderView>{
    const row=await this.prisma.order.findUnique({where:{id},include:orderInclude});
    if(!row||!this.canRead(principal,row))throw new NotFoundException("ORDER_NOT_FOUND");
    const value=this.view(row);
    if(!principal.roles.includes("CUSTOMER"))value.address={...value.address,phone:maskPhone(value.address.phone)};
    return value;
  }

  async addMerchantNote(principal:RequestPrincipal,orderId:string,merchantOrderId:string,note:string):Promise<OrderView>{
    if(!principal.merchantId)throw new ForbiddenException("MERCHANT_SCOPE_REQUIRED");
    const child=await this.prisma.merchantOrder.findFirst({where:{id:merchantOrderId,orderId,merchantId:principal.merchantId}});
    if(!child)throw new NotFoundException("MERCHANT_ORDER_NOT_FOUND");
    await this.prisma.merchantOrder.update({where:{id:merchantOrderId},data:{merchantNote:note.trim()}});
    await this.prisma.auditLog.create({data:{actorId:principal.sub,action:"order.merchant_note.updated",targetType:"MerchantOrder",targetId:merchantOrderId}});
    return this.get(principal,orderId);
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
      const rows=await this.list(principal,query);
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

  private canRead(principal:RequestPrincipal,order:OrderRecord){
    if(principal.roles.includes("CUSTOMER"))return order.userId===principal.sub;
    if(principal.roles.some((role)=>role==="PLATFORM_ADMIN"||role==="PLATFORM_OPERATOR"))return true;
    return Boolean(principal.merchantId&&order.merchantOrders.some((child)=>child.merchantId===principal.merchantId));
  }

  private view(order:OrderRecord):OrderView{
    const address=order.addressSnapshot as unknown as OrderView["address"];
    return {
      id:order.id,orderNumber:order.orderNumber,userId:order.userId,buyerDisplayName:order.buyer.displayName,buyerMaskedPhone:maskPhone(address.phone),
      status:order.status as OrderStatus,currency:order.currency,originalAmount:money(order.originalAmount),shippingAmount:money(order.shippingAmount),
      discountAmount:money(order.discountAmount),payableAmount:money(order.payableAmount),address,
      merchantOrders:order.merchantOrders.map((child)=>({id:child.id,merchantId:child.merchantId,storeId:child.storeId,storeName:child.store.name,status:child.status as OrderStatus,
        originalAmount:money(child.originalAmount),shippingAmount:money(child.shippingAmount),discountAmount:money(child.discountAmount),payableAmount:money(child.payableAmount),merchantNote:child.merchantNote,
        items:child.items.map((item)=>({id:item.id,merchantOrderId:item.merchantOrderId,storeId:item.storeId,skuId:item.skuId,productId:item.productId,productTitle:item.productTitle,
          skuName:item.skuName,coverFileId:item.coverFileId,quantity:item.quantity,currency:item.currency,unitPrice:money(item.unitPrice),originalAmount:money(item.originalAmount),
          discountAmount:money(item.discountAmount),payableAmount:money(item.payableAmount)}))})),
      payment:{id:order.paymentIntent!.id,status:order.paymentIntent!.status,provider:order.paymentIntent!.provider,amount:money(order.paymentIntent!.amount),currency:order.paymentIntent!.currency,expiresAt:order.paymentIntent!.expiresAt.toISOString()},
      createdAt:order.createdAt.toISOString(),updatedAt:order.updatedAt.toISOString()
    };
  }
}
