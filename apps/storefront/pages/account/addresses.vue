<script setup lang="ts">
import type { SaveShippingAddressInput, ShippingAddressView } from "@moecraft/shared";

definePageMeta({ middleware: "auth" });
useSeoMeta({ title: "收货地址 - MoeCraft", robots: "noindex, nofollow" });
const state = useAddresses();
const busy = ref(false);
const editingId = ref<string | null>(null);
const formOpen = ref(false);
const message = ref("");
const form = reactive<SaveShippingAddressInput>(emptyAddress());

function emptyAddress(): SaveShippingAddressInput {
  return { recipient: "", phone: "", country: "中国", province: "", city: "", district: "", addressLine: "", postalCode: "", isDefault: false };
}
function reset() {
  Object.assign(form, emptyAddress());
  editingId.value = null;
  formOpen.value = false;
}
function add() {
  Object.assign(form, emptyAddress());
  editingId.value = null;
  formOpen.value = true;
  message.value = "";
}
function edit(address: ShippingAddressView) {
  Object.assign(form, address);
  editingId.value = address.id;
  formOpen.value = true;
  message.value = "";
}
async function save() {
  busy.value = true;
  message.value = "";
  try {
    if (editingId.value) await state.update(editingId.value, form);
    else await state.create(form);
    message.value = editingId.value ? "地址已更新。" : "地址已添加。";
    reset();
  } catch { message.value = "保存失败，请检查地址信息。"; }
  finally { busy.value = false; }
}
async function makeDefault(address: ShippingAddressView) {
  busy.value = true;
  message.value = "";
  try { await state.update(address.id, { isDefault: true }); message.value = "默认地址已更新。"; }
  catch { message.value = "设置默认地址失败。"; }
  finally { busy.value = false; }
}
async function remove(address: ShippingAddressView) {
  if (!window.confirm(`确定删除 ${address.recipient} 的收货地址吗？`)) return;
  busy.value = true;
  message.value = "";
  try { await state.remove(address.id); message.value = "地址已删除。"; }
  catch { message.value = "删除地址失败。"; }
  finally { busy.value = false; }
}
onMounted(() => state.load().catch(() => undefined));
</script>

<template>
  <div class="address-page"><StorefrontHeader />
    <main>
      <header class="page-head"><div><p>ADDRESS BOOK</p><h1>收货地址</h1><span>管理下单时可快速选择的地址。</span></div><button type="button" @click="add">＋ 新增地址</button></header>
      <p v-if="message" class="message">{{ message }}</p>
      <p v-if="state.pending.value" class="state">正在加载地址…</p>
      <p v-else-if="state.error.value" class="state error">{{ state.error.value }}</p>
      <section v-else-if="state.addresses.value.length" class="address-list">
        <article v-for="address in state.addresses.value" :key="address.id" :class="{ default: address.isDefault }">
          <div class="address-title"><b>{{ address.recipient }}</b><span>{{ address.phone }}</span><em v-if="address.isDefault">默认地址</em></div>
          <p>{{ address.country }} {{ address.province }} {{ address.city }} {{ address.district }}</p>
          <p>{{ address.addressLine }} <small v-if="address.postalCode">{{ address.postalCode }}</small></p>
          <footer><button v-if="!address.isDefault" type="button" :disabled="busy" @click="makeDefault(address)">设为默认</button><button type="button" :disabled="busy" @click="edit(address)">编辑</button><button class="danger" type="button" :disabled="busy" @click="remove(address)">删除</button></footer>
        </article>
      </section>
      <section v-else class="state empty"><h2>还没有收货地址</h2><p>添加后，结算时会自动带出默认地址。</p><button type="button" @click="add">添加第一个地址</button></section>
      <form v-if="formOpen" class="editor" @submit.prevent="save">
        <header><div><small>{{ editingId ? "EDIT ADDRESS" : "NEW ADDRESS" }}</small><h2>{{ editingId ? "编辑地址" : "新增地址" }}</h2></div><button type="button" @click="reset">×</button></header>
        <div class="grid"><label>收件人<input v-model="form.recipient" required minlength="2"></label><label>联系电话<input v-model="form.phone" required minlength="6"></label><label>国家/地区<input v-model="form.country" required></label><label>省份<input v-model="form.province" required></label><label>城市<input v-model="form.city" required></label><label>区县<input v-model="form.district" required></label></div>
        <label>详细地址<input v-model="form.addressLine" required minlength="4"></label><label>邮编（可选）<input v-model="form.postalCode"></label>
        <label class="check"><input v-model="form.isDefault" type="checkbox">设为默认地址</label>
        <footer><button type="button" class="secondary" @click="reset">取消</button><button :disabled="busy">{{ busy ? "保存中…" : "保存地址" }}</button></footer>
      </form>
    </main><StorefrontFooter />
  </div>
</template>

<style scoped>
:global(body){margin:0;background:#f7f4f5;color:#2e2730;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}.address-page main{width:min(1060px,100%);box-sizing:border-box;min-height:65vh;padding:40px 24px 80px;margin:auto}.page-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:24px}.page-head p,.editor small{color:#a65071;font-size:10px;font-weight:700;letter-spacing:.16em}.page-head h1{margin:8px 0}.page-head span{color:#8b7f85;font-size:12px}button{padding:10px 15px;border:0;border-radius:8px;background:#7d3c5b;color:#fff;font:inherit;font-size:12px;cursor:pointer}button:disabled{cursor:not-allowed;opacity:.5}.address-list{display:grid;grid-template-columns:1fr 1fr;gap:14px}.address-list article{padding:20px;border:1px solid #eadfe4;border-radius:12px;background:#fff}.address-list article.default{border-color:#c77998;box-shadow:0 0 0 2px #f4e5eb}.address-title{display:flex;align-items:center;gap:10px}.address-title b{font-size:16px}.address-title span,.address-list p{color:#766b70;font-size:12px}.address-title em{margin-left:auto;padding:4px 7px;border-radius:99px;background:#f4e5eb;color:#9d4668;font-size:9px;font-style:normal}.address-list footer{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;margin-top:14px;border-top:1px solid #f0e7ea}.address-list footer button{padding:7px 10px;background:#f3eff1;color:#5f5359}.address-list footer .danger{color:#b3263e}.state{padding:60px;text-align:center}.state button{margin-top:10px}.message{padding:11px 14px;border-radius:8px;background:#f4e5eb;color:#7d3c5b}.error{color:#b3263e}.editor{display:grid;gap:14px;padding:24px;margin-top:22px;border:1px solid #eadfe4;border-radius:14px;background:#fff}.editor>header,.editor>footer{display:flex;align-items:center;justify-content:space-between}.editor h2{margin:5px 0}.editor>header>button{padding:4px 10px;background:transparent;color:#766b70;font-size:22px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.editor label{display:grid;gap:6px;font-size:12px}.editor input{box-sizing:border-box;width:100%;padding:11px;border:1px solid #d9cdd2;border-radius:8px;font:inherit}.editor .check{display:flex;align-items:center}.editor .check input{width:16px}.editor>footer{justify-content:flex-end;gap:9px}.secondary{background:#eee8eb;color:#5f5359}@media(max-width:700px){.address-list,.grid{grid-template-columns:1fr}.page-head{align-items:flex-start;flex-direction:column}.page-head>button{width:100%}}
</style>
