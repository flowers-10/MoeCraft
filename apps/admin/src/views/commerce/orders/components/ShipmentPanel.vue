<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { CARRIERS, type MerchantOrderView, type ShipmentTrackingView } from "@moecraft/shared";
import { UiBadge, UiButton, UiInput } from "@moecraft/ui";

const props = defineProps<{ child: MerchantOrderView; tracking: ShipmentTrackingView[]; busy: boolean; canManage: boolean }>();
const emit = defineEmits<{ ship: [payload: { carrier: string; trackingNumber: string; note?: string; items: { orderItemId: string; quantity: number }[] }] }>();

const form = reactive({ carrier: "SF", trackingNumber: "", note: "", quantities: {} as Record<string, number> });

function shippedQty(orderItemId: string) {
  return props.child.shipments.flatMap((shipment) => shipment.items).filter((item) => item.orderItemId === orderItemId).reduce((sum, item) => sum + item.quantity, 0);
}
function remaining(orderItemId: string, ordered: number) { return Math.max(0, ordered - shippedQty(orderItemId)); }
function resetQuantities() {
  form.quantities = Object.fromEntries(props.child.items.map((item) => [item.id, remaining(item.id, item.quantity)]));
}
watch(() => [props.child.id, props.child.shipments.length], resetQuantities, { immediate: true });

const eventsOf = (shipmentId: string) => props.tracking.find((item) => item.id === shipmentId)?.events ?? [];
const itemTitle = (orderItemId: string) => props.child.items.find((item) => item.id === orderItemId)?.productTitle ?? orderItemId;
const fmt = (value: string) => new Date(value).toLocaleString();
const canSubmit = computed(() => /^[A-Za-z0-9-]{4,80}$/.test(form.trackingNumber.trim()) && props.child.items.some((item) => (form.quantities[item.id] ?? 0) > 0));

function submit() {
  if (!canSubmit.value) return;
  const items = props.child.items.flatMap((item) => {
    const quantity = Math.min(Math.trunc(Number(form.quantities[item.id]) || 0), remaining(item.id, item.quantity));
    return quantity > 0 ? [{ orderItemId: item.id, quantity }] : [];
  });
  if (!items.length) return;
  emit("ship", { carrier: form.carrier, trackingNumber: form.trackingNumber.trim(), note: form.note.trim() || undefined, items });
  form.trackingNumber = "";
  form.note = "";
}
</script>

<template>
  <section class="shipments">
    <div class="shipments-title"><h3>包裹与物流</h3><span>{{ child.shipments.length }} 个包裹</span></div>

    <article v-for="shipment in child.shipments" :key="shipment.id" class="shipment">
      <header>
        <div class="shipment-id">
          <b>{{ shipment.carrierName }} · {{ shipment.trackingNumber }}</b>
          <small>发货于 {{ fmt(shipment.shippedAt) }}<template v-if="shipment.note"> · {{ shipment.note }}</template></small>
        </div>
        <UiBadge :tone="shipment.status === 'DELIVERED' ? 'success' : 'warning'">{{ shipment.status === 'DELIVERED' ? '已签收' : '运输中' }}</UiBadge>
      </header>
      <ul class="shipment-items">
        <li v-for="line in shipment.items" :key="line.id">{{ itemTitle(line.orderItemId) }} × {{ line.quantity }}</li>
      </ul>
      <ol v-if="eventsOf(shipment.id).length" class="timeline">
        <li v-for="event in eventsOf(shipment.id)" :key="event.occurredAt + event.description">
          <time>{{ fmt(event.occurredAt) }}</time><span>{{ event.description }}</span>
        </li>
      </ol>
    </article>
    <p v-if="!child.shipments.length" class="empty">尚未发货</p>

    <form v-if="canManage && child.shippable" class="ship-form" @submit.prevent="submit">
      <h4>手工发货</h4>
      <div class="ship-lines">
        <label v-for="item in child.items" :key="item.id" class="ship-line">
          <span class="ship-line-name">{{ item.productTitle }}<small>已发 {{ shippedQty(item.id) }} / {{ item.quantity }}</small></span>
          <input v-model.number="form.quantities[item.id]" type="number" min="0" :max="remaining(item.id, item.quantity)" :disabled="!remaining(item.id, item.quantity)" aria-label="本次发货数量" />
        </label>
      </div>
      <div class="ship-fields">
        <select v-model="form.carrier" aria-label="物流公司">
          <option v-for="carrier in CARRIERS" :key="carrier.code" :value="carrier.code">{{ carrier.name }}</option>
        </select>
        <UiInput v-model="form.trackingNumber" placeholder="物流单号（4-80 位字母数字）" />
        <UiInput v-model="form.note" placeholder="备注（可选，仅后台可见）" />
      </div>
      <div class="ship-actions">
        <UiButton type="submit" size="sm" :loading="busy" :disabled="!canSubmit">确认发货</UiButton>
      </div>
    </form>
  </section>
</template>

<style scoped lang="less">
.shipments { margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border); display: grid; gap: 12px; }
.shipments-title { display: flex; align-items: center; justify-content: space-between; }
.shipments-title h3 { margin: 0; color: var(--text); font-size: 13px; }
.shipments-title span { color: var(--text-muted); font-size: 11px; }
.shipment { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-raised); }
.shipment header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.shipment-id { display: grid; gap: 4px; min-width: 0; }
.shipment-id b { color: var(--text); font-size: 12px; overflow-wrap: anywhere; }
.shipment-id small { color: var(--text-muted); font-size: 10px; }
.shipment-items { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; padding: 0; list-style: none; color: var(--text-secondary); font-size: 11px; }
.timeline { display: grid; gap: 6px; margin: 0; padding: 8px 0 0; list-style: none; border-top: 1px solid var(--border); }
.timeline li { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 10px; align-items: baseline; }
.timeline time { color: var(--text-muted); font-size: 10px; }
.timeline span { color: var(--text-secondary); font-size: 11px; }
.empty { margin: 0; color: var(--text-muted); font-size: 11px; }
.ship-form { display: grid; gap: 10px; padding: 12px; border: 1px dashed var(--accent); border-radius: 10px; background: var(--accent-soft); }
.ship-form h4 { margin: 0; color: var(--accent); font-size: 12px; }
.ship-lines { display: grid; gap: 8px; }
.ship-line { display: grid; grid-template-columns: minmax(0, 1fr) 84px; gap: 10px; align-items: center; }
.ship-line-name { display: grid; gap: 2px; min-width: 0; color: var(--text); font-size: 12px; }
.ship-line-name small { color: var(--text-muted); font-size: 10px; }
.ship-line input { width: 100%; min-height: 32px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--surface); color: var(--text); font: inherit; }
.ship-fields { display: grid; grid-template-columns: 128px minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.ship-fields select { min-height: 39px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-raised); color: var(--text); font: inherit; }
.ship-actions { display: flex; justify-content: flex-end; }
@media (max-width: 640px) { .ship-fields { grid-template-columns: 1fr; } .timeline li { grid-template-columns: 1fr; gap: 2px; } }
</style>
