<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { UiButton, UiInput } from "@moecraft/ui";
import type { InventoryLedgerView, InventoryListItem } from "@moecraft/shared";
import { useLocale } from "../../../../i18n";

const props = defineProps<{ item: InventoryListItem; ledger: InventoryLedgerView[]; busy: boolean; canAdjust: boolean }>();
const emit = defineEmits<{ close: []; save: [payload: { delta: number; reason: string; lowStockThreshold: number }] }>();
const { locale, t } = useLocale();
const delta = ref(0);
const reason = ref("");
const threshold = ref(props.item.lowStockThreshold);
const invalid = computed(() => delta.value !== 0 && reason.value.trim().length < 2);
watch(() => props.item, (item) => { delta.value = 0; reason.value = ""; threshold.value = item.lowStockThreshold; });
function submit() { if (invalid.value || (delta.value === 0 && threshold.value === props.item.lowStockThreshold)) return; emit("save", { delta: Number(delta.value), reason: reason.value.trim(), lowStockThreshold: Number(threshold.value) }); }
function formatDate(value: string) { return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" :aria-label="t('inventory.drawerTitle')">
      <header><div><small>{{ item.skuCode }}</small><h2>{{ item.productTitle }}</h2><p>{{ item.skuName }}</p></div><button type="button" :aria-label="t('inventory.close')" @click="emit('close')">×</button></header>
      <section class="balance"><div><span>{{ t('inventory.available') }}</span><b>{{ item.available }}</b></div><div><span>{{ t('inventory.reserved') }}</span><b>{{ item.reserved }}</b></div><div><span>{{ t('inventory.onHand') }}</span><b>{{ item.onHand }}</b></div></section>
      <form v-if="canAdjust" @submit.prevent="submit">
        <h3>{{ t('inventory.adjustTitle') }}</h3>
        <div class="form-grid"><label><span>{{ t('inventory.delta') }}</span><UiInput v-model="delta" type="number" /></label><label><span>{{ t('inventory.threshold') }}</span><UiInput v-model="threshold" type="number" min="0" /></label></div>
        <label><span>{{ t('inventory.reason') }}</span><UiInput v-model="reason" :placeholder="t('inventory.reasonPlaceholder')" :invalid="invalid" /></label>
        <p v-if="invalid" class="validation">{{ t('inventory.reasonRequired') }}</p>
        <UiButton type="submit" :loading="busy" :disabled="invalid || (Number(delta) === 0 && Number(threshold) === item.lowStockThreshold)">{{ t('inventory.save') }}</UiButton>
      </form>
      <section class="ledger"><div class="section-title"><h3>{{ t('inventory.ledger') }}</h3><span>{{ ledger.length }}</span></div><div v-if="ledger.length" class="entries"><article v-for="entry in ledger" :key="entry.id"><div><b>{{ t(`inventory.type.${entry.type}`) }}</b><time>{{ formatDate(entry.createdAt) }}</time></div><p>{{ entry.reason }}</p><footer><span>{{ t('inventory.onHand') }} {{ signed(entry.onHandDelta) }} → {{ entry.onHandAfter }}</span><span>{{ t('inventory.reserved') }} {{ signed(entry.reservedDelta) }} → {{ entry.reservedAfter }}</span></footer></article></div><p v-else class="empty">{{ t('inventory.ledgerEmpty') }}</p></section>
    </aside>
  </div>
</template>

<style scoped lang="less">
.backdrop{position:fixed;z-index:1200;inset:0;background:rgb(16 20 34 / 52%)}.drawer{position:absolute;display:flex;width:min(560px,100%);height:100%;right:0;flex-direction:column;overflow:auto;background:var(--surface);box-shadow:-18px 0 55px rgb(14 19 35 / 25%)}header{display:flex;justify-content:space-between;padding:24px;border-bottom:1px solid var(--border)}header small{color:var(--accent);font-weight:700}header h2{margin:6px 0 2px;font-size:20px}header p{margin:0;color:var(--text-muted);font-size:12px}header button{width:34px;height:34px;border:0;background:transparent;color:var(--text-secondary);font-size:25px;cursor:pointer}.balance{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--border)}.balance div{display:grid;gap:5px;padding:18px 24px;border-right:1px solid var(--border)}.balance div:last-child{border:0}.balance span{color:var(--text-muted);font-size:10px}.balance b{font-size:21px}form,.ledger{padding:22px 24px;border-bottom:1px solid var(--border)}h3{margin:0 0 16px;font-size:14px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:grid;gap:7px;margin-bottom:14px}label>span{color:var(--text-secondary);font-size:11px}.validation{margin:-7px 0 12px;color:var(--danger);font-size:11px}.section-title{display:flex;align-items:center;justify-content:space-between}.section-title span{color:var(--text-muted);font-size:11px}.entries{display:grid;gap:0}article{padding:15px 0;border-top:1px solid var(--border)}article>div,article footer{display:flex;align-items:center;justify-content:space-between;gap:12px}article b{font-size:11px}time{color:var(--text-muted);font-size:9px}article p{margin:7px 0;color:var(--text-secondary);font-size:11px}article footer{justify-content:flex-start;color:var(--text-muted);font-size:10px}.empty{padding:30px 0;color:var(--text-muted);text-align:center}@media(max-width:520px){.balance div{padding:15px}.form-grid{grid-template-columns:1fr}}
</style>
