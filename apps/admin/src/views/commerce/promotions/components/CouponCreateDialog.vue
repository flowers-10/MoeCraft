<script setup lang="ts">
import { reactive } from "vue";
import { UiButton } from "@moecraft/ui";
import { emptyCouponDraft, type CouponDraft } from "../composables/usePromotionManagement";

defineProps<{ busy: boolean }>();
const emit = defineEmits<{ close: []; submit: [draft: CouponDraft] }>();
const draft = reactive(emptyCouponDraft());
function submit() { if (draft.code && draft.name && draft.value && draft.startsAt && draft.endsAt) emit("submit", { ...draft }); }
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <form class="dialog" @submit.prevent="submit">
      <header><div><small>NEW CAMPAIGN</small><h2>创建优惠券</h2></div><button type="button" aria-label="关闭" @click="emit('close')">×</button></header>
      <div class="grid">
        <label><span>优惠码</span><input v-model="draft.code" maxlength="40" required placeholder="MOE2026"></label>
        <label><span>活动名称</span><input v-model="draft.name" maxlength="160" required placeholder="夏日创作祭"></label>
        <label><span>优惠类型</span><select v-model="draft.type"><option value="FIXED">固定减免</option><option value="PERCENTAGE">百分比</option></select></label>
        <label><span>{{ draft.type === 'FIXED' ? '减免金额（元）' : '优惠百分比' }}</span><input v-model="draft.value" type="number" min="0.01" :max="draft.type === 'PERCENTAGE' ? 100 : undefined" step="0.01" required></label>
        <label><span>最低金额（元）</span><input v-model="draft.minimumAmount" type="number" min="0" step="0.01" required></label>
        <label><span>总领取量</span><input v-model.number="draft.totalLimit" type="number" min="1" required></label>
        <label><span>每人限领</span><input v-model.number="draft.perUserLimit" type="number" min="1" required></label>
        <label><span>开始时间</span><input v-model="draft.startsAt" type="datetime-local" required></label>
        <label><span>结束时间</span><input v-model="draft.endsAt" type="datetime-local" required></label>
        <label class="wide"><span>限定商品 ID（逗号分隔，留空表示全店）</span><textarea v-model="draft.productIds" rows="3" placeholder="product_id_1, product_id_2" /></label>
      </div>
      <footer><UiButton type="button" variant="ghost" @click="emit('close')">取消</UiButton><UiButton type="submit" :disabled="busy">{{ busy ? "创建中…" : "创建优惠券" }}</UiButton></footer>
    </form>
  </div>
</template>

<style scoped lang="less">
.backdrop{position:fixed;z-index:50;inset:0;display:grid;place-items:center;padding:18px;background:#05080dcc}.dialog{width:min(760px,100%);max-height:92dvh;overflow:auto;padding:24px;border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}header,footer{display:flex;align-items:center;justify-content:space-between}header small{color:var(--accent);font-weight:700;letter-spacing:.14em}h2{margin:5px 0 20px;color:var(--text)}header button{border:0;background:none;color:var(--text-muted);font-size:25px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grid label{display:grid;gap:6px}.grid span{color:var(--text-secondary);font-size:11px}.grid input,.grid select,.grid textarea{width:100%;padding:10px 11px;border:1px solid var(--border);border-radius:7px;background:var(--surface-raised);color:var(--text)}.wide{grid-column:1/-1}footer{justify-content:flex-end;gap:10px;margin-top:22px}@media(max-width:620px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}}
</style>
