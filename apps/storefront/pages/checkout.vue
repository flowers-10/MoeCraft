<script setup lang="ts">
import type { CheckoutQuote, ShippingAddressSnapshot } from "@moecraft/shared";
definePageMeta({middleware:"auth"});
useHead({meta:[{name:"robots",content:"noindex, nofollow"}]});
const api=useOrders(),cart=useCart();
const address=reactive<ShippingAddressSnapshot>({recipient:"",phone:"",country:"中国",province:"",city:"",district:"",addressLine:"",postalCode:""});
const couponCode=ref(""),quote=ref<CheckoutQuote|null>(null),busy=ref(false),error=ref("");
async function preview(){busy.value=true;error.value="";try{quote.value=await api.quote(address,couponCode.value);}catch{error.value="结算试算失败，请检查地址、库存和优惠券。";}finally{busy.value=false;}}
async function submit(){if(!quote.value?.valid)return;busy.value=true;error.value="";try{const order=await api.submit(quote.value);await cart.refresh();await navigateTo(`/payments/${order.id}`);}catch{error.value="提交失败，价格或库存可能已变化，请重新试算。";quote.value=null;}finally{busy.value=false;}}
</script>
<template><div class="checkout-page"><StorefrontHeader/><main><header><p>SECURE CHECKOUT</p><h1>确认订单</h1></header>
<div class="layout"><form class="panel" @submit.prevent="preview"><h2>收货地址</h2><div class="grid">
<label>收件人<input v-model="address.recipient" required minlength="2"></label><label>联系电话<input v-model="address.phone" required minlength="6"></label>
<label>国家/地区<input v-model="address.country" required></label><label>省份<input v-model="address.province" required></label><label>城市<input v-model="address.city" required></label><label>区县<input v-model="address.district" required></label></div>
<label>详细地址<input v-model="address.addressLine" required minlength="4"></label><label>邮编（可选）<input v-model="address.postalCode"></label><label>优惠码（可选）<input v-model="couponCode"></label><button :disabled="busy">{{busy?"正在试算…":"试算订单"}}</button></form>
<aside class="panel summary"><h2>订单预览</h2><p v-if="!quote">填写地址后获取服务端最终试算。</p><template v-else><article v-for="group in quote.groups" :key="group.storeId"><h3>{{group.storeName}}</h3><p v-for="item in group.items" :key="item.skuId">{{item.productTitle}} × {{item.quantity}} <b>¥{{item.payableAmount}}</b><em v-if="!item.valid">{{item.invalidReason}}</em></p></article>
<dl><dt>商品</dt><dd>¥{{quote.originalAmount}}</dd><dt>运费</dt><dd>¥{{quote.shippingAmount}}</dd><dt>优惠</dt><dd>-¥{{quote.discountAmount}}</dd><dt>应付</dt><dd class="total">¥{{quote.payableAmount}}</dd></dl><p>试算有效至 {{new Date(quote.expiresAt).toLocaleTimeString()}}</p><button :disabled="busy||!quote.valid" @click="submit">提交订单并支付</button></template><p v-if="error" class="error">{{error}}</p></aside></div></main><StorefrontFooter/></div></template>
<style scoped>
:global(body){margin:0;background:#f7f4f5;color:#2e2730;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.checkout-page main{max-width:1120px;margin:auto;padding:28px 22px 70px}header p{color:#a65071;font-size:11px;letter-spacing:.16em}.layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:22px}.panel{display:grid;gap:16px;padding:24px;border:1px solid #eadfe4;border-radius:14px;background:white}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:grid;gap:6px;font-size:13px}input,button{padding:11px;border:1px solid #d9cdd2;border-radius:8px;font:inherit}button{border:0;background:#7d3c5b;color:#fff;cursor:pointer}.summary{align-self:start}.summary article{border-bottom:1px solid #eee}.summary article p{display:flex;gap:8px}.summary article b{margin-left:auto}.summary em,.error{color:#b3263e}.summary dl{display:grid;grid-template-columns:1fr auto;gap:8px}.summary dd{margin:0}.total{font-size:22px;color:#d44870;font-weight:800}@media(max-width:800px){.layout{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}
</style>
