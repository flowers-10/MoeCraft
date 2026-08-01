import type { AvailableCouponView, CheckoutQuote, OrderListItem, OrderView, PaymentView, SandboxPaymentResult, ShippingAddressSnapshot } from "@moecraft/shared";

export function useOrders(){
  const {request}=useApi();
  const orders=useState<OrderListItem[]>("buyer-orders",()=>[]);
  const pending=ref(false);
  const error=ref<string|null>(null);
  async function list(){pending.value=true;error.value=null;try{orders.value=await request<OrderListItem[]>("/orders");return orders.value;}catch{error.value="订单加载失败";throw new Error(error.value);}finally{pending.value=false;}}
  const get=(id:string)=>request<OrderView>(`/orders/${encodeURIComponent(id)}`);
  const claimCoupon=(couponId:string)=>request<{id:string;couponId:string;claimedAt:string}>("/promotions/claim",{method:"POST",body:{couponId}});
  const claimedCouponIds=()=>request<string[]>("/promotions/claimed");
  const availableCoupons=()=>request<AvailableCouponView[]>("/promotions/available");
  const quote=(address:ShippingAddressSnapshot,couponId?:string)=>request<CheckoutQuote>("/checkout/quotes",{method:"POST",body:{address,couponId:couponId||undefined}});
  const submit=(value:CheckoutQuote)=>request<OrderView>("/orders",{method:"POST",headers:{"Idempotency-Key":crypto.randomUUID()},body:{quoteId:value.id,signature:value.signature}});
  const cancel=(id:string)=>request<OrderView>(`/orders/${encodeURIComponent(id)}/cancel`,{method:"PATCH"});
  const confirmReceipt=(id:string)=>request<OrderView>(`/orders/${encodeURIComponent(id)}/confirm-receipt`,{method:"PATCH"});
  const startPayment=(orderId:string)=>request<PaymentView>(`/payments/${encodeURIComponent(orderId)}/start`,{method:"POST"});
  const payment=(orderId:string)=>request<PaymentView>(`/payments/${encodeURIComponent(orderId)}`);
  const closePayment=(orderId:string)=>request<PaymentView>(`/payments/${encodeURIComponent(orderId)}/close`,{method:"POST"});
  const simulate=(orderId:string,result:SandboxPaymentResult)=>request<PaymentView>(`/payments/${encodeURIComponent(orderId)}/simulate`,{method:"POST",body:{result}});
  return{orders,pending,error,list,get,claimCoupon,claimedCouponIds,availableCoupons,quote,submit,cancel,confirmReceipt,startPayment,payment,closePayment,simulate};
}
