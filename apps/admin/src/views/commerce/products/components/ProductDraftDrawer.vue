<script setup lang="ts">
import { computed } from "vue";
import { UiButton, UiField, UiInput, UiSelect, UiTextarea } from "@moecraft/ui";
import type { CatalogOverview, ProductDraftInput, ProductReviewEventView, ProductStatus } from "@moecraft/shared";
import { apiRequest } from "../../../../api";
import { useLocale } from "../../../../i18n";
import { productStatusKeys } from "../productI18n";

const props = defineProps<{ modelValue: ProductDraftInput; catalog: CatalogOverview | null; reviewEvents: ProductReviewEventView[]; editing: boolean; editable: boolean; busy: boolean }>();
const emit = defineEmits<{ close: []; save: [] }>();
const { locale, t } = useLocale();
const characters = computed(() => props.catalog?.characters.filter(item => !props.modelValue.franchiseId || item.franchiseId === props.modelValue.franchiseId) ?? []);
function catalogName(item: { nameZhCn: string; nameEnUs: string | null }) { return locale.value === "en-US" ? item.nameEnUs || item.nameZhCn : item.nameZhCn || item.nameEnUs || ""; }
function statusLabel(status: ProductStatus) { return t(productStatusKeys[status]); }
function formatDate(value: string) { return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function addSku() { props.modelValue.skus.push({ code: `MC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, nameZhCn: "", optionValues: {}, priceAmount: 0, currency: "CNY", initialStock: 0 }); }
function addMedia() { props.modelValue.media.push({ fileId: "", kind: "IMAGE", sortOrder: props.modelValue.media.length, isCover: !props.modelValue.media.length }); }
function cover(index: number) { props.modelValue.media.forEach((item, current) => item.isCover = current === index); }
async function registerFile(index: number, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const asset = await apiRequest<{ id: string }>("/files", { method: "POST", body: JSON.stringify({ purpose: "product-media", fileName: file.name, mimeType: file.type, sizeBytes: file.size }) });
  props.modelValue.media[index]!.fileId = asset.id;
  props.modelValue.media[index]!.altZhCn ||= file.name.replace(/\.[^.]+$/, "");
}
</script>

<template>
  <div class="mask" @mousedown.self="emit('close')">
    <form class="drawer" @submit.prevent="emit('save')">
      <header>
        <div><small>PRODUCT DRAFT</small><h2>{{ editing ? t('products.drawerEditTitle') : t('products.drawerNewTitle') }}</h2></div>
        <UiButton variant="ghost" :aria-label="t('products.closeAria')" @click="emit('close')">×</UiButton>
      </header>
      <div class="scroll">
        <aside><b>{{ editable ? t('products.rulesTitle') : t('products.rulesReadOnlyTitle') }}</b><p v-if="editable">{{ t('products.rulesEditable') }}</p><p v-else>{{ t('products.rulesReadOnly') }}</p><p v-if="editable">{{ t('products.rulesSubmit') }}</p></aside>
        <section v-if="reviewEvents.length" class="history">
          <h3>{{ t('products.history') }}</h3>
          <article v-for="event in reviewEvents" :key="event.id">
            <div><b>{{ statusLabel(event.fromStatus) }} → {{ statusLabel(event.toStatus) }}</b><time>{{ formatDate(event.createdAt) }}</time></div>
            <p v-if="event.reason">{{ event.reason }}</p>
            <ul v-if="event.fieldFeedback.length"><li v-for="item in event.fieldFeedback" :key="`${item.field}-${item.message}`">{{ t('products.feedbackLine', { field: item.field, message: item.message }) }}</li></ul>
          </article>
        </section>
        <fieldset :disabled="!editable">
          <h3>{{ t('products.baseInfo') }}</h3>
          <div class="grid">
            <UiField :label="t('products.titleZhCn')" required><UiInput v-model="modelValue.titleZhCn" required maxlength="200" /></UiField>
            <UiField :label="t('products.titleEnUs')"><UiInput v-model="modelValue.titleEnUs" maxlength="200" /></UiField>
            <UiField :label="t('products.category')"><UiSelect v-model="modelValue.categoryId"><option value="">{{ t('products.draftNoSelection') }}</option><option v-for="item in catalog?.categories" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
            <UiField :label="t('products.brand')"><UiSelect v-model="modelValue.brandId"><option value="">{{ t('products.unselected') }}</option><option v-for="item in catalog?.brands" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
            <UiField :label="t('products.franchise')"><UiSelect v-model="modelValue.franchiseId"><option value="">{{ t('products.unselected') }}</option><option v-for="item in catalog?.franchises" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
            <UiField :label="t('products.character')"><UiSelect v-model="modelValue.characterId"><option value="">{{ t('products.unselected') }}</option><option v-for="item in characters" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
            <UiField :label="t('products.material')"><UiInput v-model="modelValue.material" :placeholder="t('products.materialPlaceholder')" /></UiField>
            <UiField :label="t('products.scale')"><UiInput v-model="modelValue.scale" :placeholder="t('products.scalePlaceholder')" /></UiField>
            <UiField :label="t('products.manufacturer')"><UiInput v-model="modelValue.manufacturer" /></UiField>
            <UiField :label="t('products.copyright')"><UiInput v-model="modelValue.copyrightNotice" /></UiField>
            <UiField class="full" :label="t('products.descriptionZhCn')"><UiTextarea v-model="modelValue.descriptionZhCn" rows="4" /></UiField>
            <UiField class="full" :label="t('products.descriptionEnUs')"><UiTextarea v-model="modelValue.descriptionEnUs" rows="3" /></UiField>
          </div>
          <div class="section-title"><h3>{{ t('products.skuSection') }}</h3><UiButton v-if="editable" size="sm" variant="secondary" @click="addSku">＋ {{ t('products.addSku') }}</UiButton></div>
          <article v-for="(sku, index) in modelValue.skus" :key="index" class="repeat">
            <div class="grid">
              <UiField :label="t('products.merchantCode')" :hint="t('products.merchantCodeHint')"><UiInput v-model="sku.code" /></UiField>
              <UiField :label="t('products.skuName')" required><UiInput v-model="sku.nameZhCn" required /></UiField>
              <UiField :label="t('products.options')"><UiInput v-model="sku.optionValues['规格']" :placeholder="t('products.optionsPlaceholder')" /></UiField>
              <UiField :label="t('products.barcode')"><UiInput v-model="sku.barcode" /></UiField>
              <UiField :label="t('products.priceCents')"><UiInput v-model="sku.priceAmount" type="number" min="0" /></UiField>
              <UiField :label="t('products.initialStock')"><UiInput v-model="sku.initialStock" type="number" min="0" /></UiField>
              <UiField :label="t('products.weightGrams')"><UiInput v-model="sku.weightGrams" type="number" min="0" /></UiField>
              <UiField :label="t('products.dimensionsMm')"><div class="dimensions"><UiInput v-model="sku.lengthMm" type="number" min="0" :placeholder="t('products.length')" /><UiInput v-model="sku.widthMm" type="number" min="0" :placeholder="t('products.width')" /><UiInput v-model="sku.heightMm" type="number" min="0" :placeholder="t('products.height')" /></div></UiField>
            </div>
            <UiButton v-if="editable" size="sm" variant="ghost" @click="modelValue.skus.splice(index, 1)">{{ t('products.removeSku') }}</UiButton>
          </article>
          <div class="section-title"><h3>{{ t('products.mediaSection') }}</h3><UiButton v-if="editable" size="sm" variant="secondary" @click="addMedia">＋ {{ t('products.addMedia') }}</UiButton></div>
          <article v-for="(media, index) in modelValue.media" :key="index" class="repeat media">
            <UiField :label="t('products.selectImage')" required :hint="t('products.selectImageHint')"><input v-if="editable" type="file" accept="image/jpeg,image/png,image/webp" @change="registerFile(index, $event)"><UiInput v-model="media.fileId" required readonly :placeholder="t('products.fileIdPlaceholder')" /></UiField>
            <UiField :label="t('products.mediaType')"><UiSelect v-model="media.kind"><option value="IMAGE">{{ t('products.image') }}</option><option value="VIDEO">{{ t('products.videoReserved') }}</option></UiSelect></UiField>
            <UiField :label="t('products.altZhCn')"><UiInput v-model="media.altZhCn" /></UiField>
            <UiField :label="t('products.sortOrder')"><UiInput v-model="media.sortOrder" type="number" min="0" /></UiField>
            <div v-if="editable" class="media-actions"><UiButton size="sm" :variant="media.isCover ? 'primary' : 'secondary'" @click="cover(index)">{{ media.isCover ? t('products.currentCover') : t('products.setCover') }}</UiButton><UiButton size="sm" variant="ghost" @click="modelValue.media.splice(index, 1)">{{ t('products.remove') }}</UiButton></div>
          </article>
        </fieldset>
      </div>
      <footer><span>{{ editable ? t('products.footerEditable') : t('products.footerReadOnly') }}</span><UiButton variant="secondary" @click="emit('close')">{{ t('products.close') }}</UiButton><UiButton v-if="editable" type="submit" :loading="busy">{{ t('products.saveDraft') }}</UiButton></footer>
    </form>
  </div>
</template>

<style scoped lang="less">.mask{position:fixed;z-index:110;inset:0;display:flex;justify-content:flex-end;background:#1714238c}.drawer{display:flex;width:min(880px,96vw);height:100%;flex-direction:column;background:var(--surface);color:var(--text)}.drawer>header{display:flex;justify-content:space-between;padding:22px 28px;border-bottom:1px solid var(--border)}header small{color:var(--accent);font-size:9px;letter-spacing:.16em}header h2{margin:7px 0}.scroll{flex:1;overflow:auto;padding:22px 28px}.scroll>aside{padding:14px 16px;border:1px solid #d8d0ff;border-radius:11px;background:var(--accent-soft);font-size:11px;line-height:1.65}.scroll>aside p{margin:5px 0}.scroll>aside strong{color:var(--danger)}.history{margin-top:18px}.history article{padding:12px;margin-top:8px;border:1px solid var(--border);border-radius:10px}.history article div{display:flex;justify-content:space-between}.history time{color:var(--text-muted);font-size:9px}.history p,.history ul{margin:8px 0 0;font-size:11px;line-height:1.6}fieldset{padding:0;border:0}fieldset:disabled{opacity:.72}h3{margin:25px 0 13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.full{grid-column:1/-1}.section-title{display:flex;align-items:center;justify-content:space-between}.repeat{padding:15px;margin-bottom:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface-raised)}.repeat>button{margin-top:10px}.dimensions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.media{display:grid;grid-template-columns:2fr 1fr 2fr 100px;gap:10px}.media-actions{display:flex;grid-column:1/-1;gap:8px}.drawer>footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 28px;border-top:1px solid var(--border)}.drawer>footer span{margin-right:auto;color:var(--text-muted);font-size:10px}@media(max-width:650px){.grid,.media{grid-template-columns:1fr}.full{grid-column:auto}.drawer>footer span{display:none}}</style>
