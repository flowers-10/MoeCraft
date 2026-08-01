<script setup lang="ts">
import type { AvailableCouponView, CheckoutQuote, ShippingAddressSnapshot, ShippingAddressView } from "@moecraft/shared";

definePageMeta({ middleware: "auth" });
useSeoMeta({ title: "确认订单 - MoeCraft", robots: "noindex, nofollow" });
const api = useOrders();
const cart = useCart();
const addressBook = useAddresses();
const address = reactive<ShippingAddressSnapshot>(emptyAddress());
const selectedAddressId = ref<string | null>(null);
const choosing = ref(false);
const manual = ref(true);
const coupons = ref<AvailableCouponView[]>([]);
const selectedCouponId = ref<string | null>(null);
const skipCoupon = ref(false);
const quote = ref<CheckoutQuote | null>(null);
const busy = ref(false);
const error = ref("");

function emptyAddress(): ShippingAddressSnapshot {
  return { recipient: "", phone: "", country: "中国", province: "", city: "", district: "", addressLine: "", postalCode: "" };
}
function applyAddress(saved: ShippingAddressView) {
  Object.assign(address, { recipient: saved.recipient, phone: saved.phone, country: saved.country, province: saved.province, city: saved.city, district: saved.district, addressLine: saved.addressLine, postalCode: saved.postalCode ?? "" });
  selectedAddressId.value = saved.id;
  manual.value = false;
  choosing.value = false;
  quote.value = null;
  error.value = "";
}
function useNewAddress() {
  Object.assign(address, emptyAddress());
  selectedAddressId.value = null;
  manual.value = true;
  choosing.value = false;
  quote.value = null;
  error.value = "";
}
async function preview() {
  busy.value = true;
  error.value = "";
  try {
    if (manual.value) {
      const saved = await addressBook.create({ ...address });
      applyAddress(saved);
    }
    coupons.value = await api.availableCoupons();
    const selected = skipCoupon.value ? undefined : coupons.value.find((coupon) => coupon.id === selectedCouponId.value && coupon.eligible) ?? coupons.value.find((coupon) => coupon.eligible);
    selectedCouponId.value = selected?.id ?? null;
    quote.value = await api.quote(address, selectedCouponId.value ?? undefined);
  } catch { error.value = "保存地址或结算试算失败，请检查地址和库存。"; }
  finally { busy.value = false; }
}
async function submit() {
  if (!quote.value?.valid) return;
  busy.value = true;
  error.value = "";
  try {
    const order = await api.submit(quote.value);
    await cart.refresh();
    await navigateTo(`/payments/${order.id}`);
  } catch {
    error.value = "提交失败，价格或库存可能已变化，请重新试算。";
    quote.value = null;
  } finally { busy.value = false; }
}
onMounted(async () => {
  const [addresses, available] = await Promise.all([addressBook.load().catch(() => []), api.availableCoupons().catch(() => [])]);
  coupons.value = available;
  selectedCouponId.value = available.find((coupon) => coupon.eligible)?.id ?? null;
  const initial = addresses.find((item) => item.isDefault);
  if (initial) applyAddress(initial);
});
</script>

<template>
  <div class="checkout-page"><StorefrontHeader />
    <main><header class="page-head"><p>SECURE CHECKOUT</p><h1>确认订单</h1></header>
      <div class="layout">
        <form class="panel address-panel" @submit.prevent="preview">
          <div class="panel-head"><div><h2>收货地址</h2><p v-if="selectedAddressId">已使用保存的地址</p><p v-else>填写后将保存到地址簿</p></div><div class="address-actions"><button type="button" class="secondary" :disabled="!addressBook.addresses.value.length" @click="choosing = !choosing">切换地址</button><button v-if="!manual" type="button" class="secondary" @click="useNewAddress">使用新地址</button><NuxtLink to="/account/addresses">管理地址</NuxtLink></div></div>
          <section v-if="choosing" class="chooser">
            <button v-for="saved in addressBook.addresses.value" :key="saved.id" type="button" :class="{ active: saved.id === selectedAddressId }" @click="applyAddress(saved)"><span><b>{{ saved.recipient }}</b> {{ saved.phone }} <em v-if="saved.isDefault">默认</em></span><small>{{ saved.province }} {{ saved.city }} {{ saved.district }} {{ saved.addressLine }}</small></button>
          </section>
          <p v-if="addressBook.pending.value" class="hint">正在加载地址簿…</p>
          <div class="grid"><label>收件人<input v-model="address.recipient" :disabled="!manual" required minlength="2"></label><label>联系电话<input v-model="address.phone" :disabled="!manual" required minlength="6"></label><label>国家/地区<input v-model="address.country" :disabled="!manual" required></label><label>省份<input v-model="address.province" :disabled="!manual" required></label><label>城市<input v-model="address.city" :disabled="!manual" required></label><label>区县<input v-model="address.district" :disabled="!manual" required></label></div>
          <label>详细地址<input v-model="address.addressLine" :disabled="!manual" required minlength="4"></label><label>邮编（可选）<input v-model="address.postalCode" :disabled="!manual"></label>
          <section class="coupon-picker"><div><b>优惠券</b><small>已自动选择当前最优惠的一张</small></div><button type="button" :class="{ active: skipCoupon }" @click="skipCoupon = true; selectedCouponId = null; quote = null">不使用优惠券</button><button v-for="coupon in coupons" :key="coupon.claimId" type="button" :disabled="!coupon.eligible" :class="{ active: !skipCoupon && selectedCouponId === coupon.id }" @click="skipCoupon = false; selectedCouponId = coupon.id; quote = null"><span><b>{{ coupon.name }}</b> · {{ coupon.type === 'FIXED' ? `减 ¥${coupon.value}` : `${coupon.value}%` }}</span><small v-if="coupon.eligible">可优惠 ¥{{ coupon.discountAmount }}</small><small v-else>还差 ¥{{ coupon.missingAmount }} 可用</small></button><p v-if="!coupons.length" class="hint">暂无已领取优惠券，可前往店铺首页领取。</p></section>
          <button :disabled="busy">{{ busy ? "处理中…" : manual ? "保存地址并试算" : "试算订单" }}</button>
        </form>
        <aside class="panel summary"><h2>订单预览</h2><p v-if="!quote">选择或填写收货地址后，获取服务端最终试算。</p><template v-else><article v-for="group in quote.groups" :key="group.storeId"><h3>{{ group.storeName }}</h3><p v-for="item in group.items" :key="item.skuId">{{ item.productTitle }} × {{ item.quantity }} <b>¥{{ item.payableAmount }}</b><em v-if="!item.valid">{{ item.invalidReason }}</em></p></article><dl><dt>商品</dt><dd>¥{{ quote.originalAmount }}</dd><dt>运费</dt><dd>¥{{ quote.shippingAmount }}</dd><dt>优惠</dt><dd>-¥{{ quote.discountAmount }}</dd><dt>应付</dt><dd class="total">¥{{ quote.payableAmount }}</dd></dl><p>试算有效至 {{ new Date(quote.expiresAt).toLocaleTimeString() }}</p><button :disabled="busy || !quote.valid" @click="submit">提交订单并支付</button></template><p v-if="error" class="error">{{ error }}</p></aside>
      </div>
    </main><StorefrontFooter />
  </div>
</template>

<style scoped>
:global(body){margin:0;background:#f7f4f5;color:#2e2730;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.checkout-page main{width:min(1120px,100%);box-sizing:border-box;margin:auto;padding:36px 22px 70px}.page-head p{color:#a65071;font-size:11px;letter-spacing:.16em}.page-head h1{margin:18px 0 26px}.layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:22px}.panel{display:grid;gap:16px;padding:24px;border:1px solid #eadfe4;border-radius:14px;background:white}.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.panel-head h2{margin:0}.panel-head p,.hint{margin:5px 0 0;color:#8b7f85;font-size:11px}.address-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:7px}.address-actions button,.address-actions a{padding:8px 10px;border-radius:7px;background:#f2edef;color:#675b61;font-size:10px;text-decoration:none}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:grid;gap:6px;font-size:13px}input,button{box-sizing:border-box;padding:11px;border:1px solid #d9cdd2;border-radius:8px;font:inherit}input:disabled{background:#f7f4f5;color:#62575c;opacity:1}button{border:0;background:#7d3c5b;color:#fff;cursor:pointer}button:disabled{cursor:not-allowed;opacity:.5}.secondary{background:#f2edef;color:#675b61}.coupon-picker{display:grid;gap:8px;padding:12px;border-radius:10px;background:#faf7f8}.coupon-picker>div{display:flex;justify-content:space-between}.coupon-picker small{color:#8b7f85}.coupon-picker button{display:flex;justify-content:space-between;background:#fff;color:#62575c;border:1px solid transparent;text-align:left}.coupon-picker button.active{border-color:#bb6e8b;background:#fff8fb}.chooser{display:grid;gap:8px;padding:10px;border-radius:10px;background:#faf7f8}.chooser button{display:grid;gap:5px;padding:11px;border:1px solid transparent;background:#fff;color:#62575c;text-align:left}.chooser button.active{border-color:#bb6e8b;background:#fff8fb}.chooser span{font-size:12px}.chooser small{overflow:hidden;color:#8b7f85;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.chooser em{padding:3px 6px;border-radius:99px;background:#f4e5eb;color:#9d4668;font-size:8px;font-style:normal}.summary{align-self:start}.summary article{border-bottom:1px solid #eee}.summary article p{display:flex;gap:8px}.summary article b{margin-left:auto}.summary em,.error{color:#b3263e}.summary dl{display:grid;grid-template-columns:1fr auto;gap:8px}.summary dd{margin:0}.total{font-size:22px;color:#d44870;font-weight:800}@media(max-width:800px){.layout{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.panel-head{flex-direction:column}.address-actions{justify-content:flex-start}.summary{order:-1}}@media(max-width:480px){.checkout-page main{padding-inline:14px}.panel{padding:18px}.address-actions button,.address-actions a{flex:1;text-align:center}}
</style>
