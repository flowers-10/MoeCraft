<script setup lang="ts">
import type { PaymentStatus, PaymentView, SandboxPaymentResult } from "@moecraft/shared";
definePageMeta({middleware:"auth"});
useHead({meta:[{name:"robots",content:"noindex, nofollow"}]});
const route=useRoute();
const orderId=computed(()=>String(route.params.orderId));
const api=useOrders();
const payment=ref<PaymentView|null>(null);
const error=ref("");
const busy=ref(false);
let timer:ReturnType<typeof setInterval>|undefined;
const labels:Record<PaymentStatus,string>={PENDING:"等待支付",PROCESSING:"支付处理中",SUCCEEDED:"支付成功",FAILED:"支付失败",CANCELLED:"支付已取消",PARTIALLY_REFUNDED:"部分退款",REFUNDED:"已退款"};
const terminal=computed(()=>payment.value&&["SUCCEEDED","CANCELLED","REFUNDED"].includes(payment.value.status));
async function load(start=false){try{payment.value=start?await api.startPayment(orderId.value):await api.payment(orderId.value);error.value="";if(terminal.value&&timer)clearInterval(timer);}catch{error.value="无法恢复支付状态，请稍后重试。";}}
async function simulate(result:SandboxPaymentResult){busy.value=true;try{payment.value=await api.simulate(orderId.value,result);}catch{error.value="沙箱支付操作失败";}finally{busy.value=false;}}
onMounted(async()=>{await load(true);timer=setInterval(()=>load(false),2000);});
onBeforeUnmount(()=>{if(timer)clearInterval(timer);});
</script>

<template>
  <div class="payment-page">
    <StorefrontHeader/>
    <main>
      <section class="card" aria-live="polite">
        <p class="eyebrow">SANDBOX PAYMENT</p>
        <h1>{{ payment ? labels[payment.status] : "正在恢复支付…" }}</h1>
        <p v-if="payment">订单 {{ payment.orderNumber }}</p>
        <strong v-if="payment">¥{{ payment.amount }}</strong>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-if="payment?.status==='PROCESSING'||payment?.status==='FAILED'" class="sandbox">
          <p>本地沙箱：请选择本次支付结果</p>
          <button :disabled="busy" @click="simulate('SUCCEEDED')">模拟成功</button>
          <button :disabled="busy" @click="simulate('FAILED')">模拟失败</button>
          <button :disabled="busy" @click="simulate('CANCELLED')">模拟取消</button>
        </div>
        <div class="links">
          <NuxtLink v-if="payment?.status==='SUCCEEDED'" :to="`/account/orders/${orderId}`">查看订单</NuxtLink>
          <NuxtLink v-else to="/account/orders">返回订单列表</NuxtLink>
        </div>
      </section>
    </main>
    <StorefrontFooter/>
  </div>
</template>

<style scoped>
:global(body){margin:0;background:#f7f3f5;color:#2f2730;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.payment-page{min-height:100vh}.payment-page main{display:grid;min-height:70vh;place-items:center;padding:24px}.card{width:min(92vw,520px);padding:40px;border:1px solid #eadde3;border-radius:18px;background:#fff;text-align:center;box-shadow:0 20px 70px #4a213218}.eyebrow{color:#a44e70;font-size:11px;letter-spacing:.18em}.card h1{margin:12px 0}.card strong{display:block;margin:18px;font-size:30px;color:#d44870}.error{color:#b42334}.sandbox{margin:24px 0;padding:18px;border-radius:12px;background:#faf6f8}.sandbox button,.links a{margin:5px;padding:10px 14px;border:0;border-radius:8px;background:#7b3b5a;color:#fff;text-decoration:none;cursor:pointer}.sandbox button:nth-of-type(2),.sandbox button:nth-of-type(3){background:#806e77}
</style>
