<script setup lang="ts">
import { computed, ref } from "vue";
import { UiButton, UiField, UiFileUpload, UiForm, UiFormSection, UiInput, UiSelect, UiTextarea, type UiFormRules } from "@moecraft/ui";
import type { CatalogOverview, ProductDraftInput, ProductReviewEventView, ProductStatus } from "@moecraft/shared";
import { uploadFile } from "../../../../api";
import { useLocale } from "../../../../i18n";
import { productStatusKeys } from "../productI18n";

const props = defineProps<{ modelValue: ProductDraftInput; catalog: CatalogOverview | null; reviewEvents: ProductReviewEventView[]; editing: boolean; editable: boolean; busy: boolean }>();
const emit = defineEmits<{ close: []; save: [] }>();
const { locale, t } = useLocale();
const uploadingIndex = ref<number | null>(null);
const uploadErrors = ref<Record<number, string>>({});
const validationError = ref("");
const characters = computed(() => props.catalog?.characters.filter(item => !props.modelValue.franchiseId || item.franchiseId === props.modelValue.franchiseId) ?? []);

function catalogName(item: { nameZhCn: string; nameEnUs: string | null }) { return locale.value === "en-US" ? item.nameEnUs || item.nameZhCn : item.nameZhCn || item.nameEnUs || ""; }
function statusLabel(status: ProductStatus) { return t(productStatusKeys[status]); }
function formatDate(value: string) { return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
const formRules = computed<UiFormRules>(() => {
  const rules: UiFormRules = {
    titleZhCn: { required: true, message: t("products.error.titleRequired") },
    categoryId: { required: true, message: t("products.error.categoryRequired") },
    descriptionZhCn: { required: true, message: t("products.error.descriptionRequired") },
    skus: { required: true, message: t("products.error.skuRequired") },
    media: { required: true, validator: (value) => Array.isArray(value) && value.some((item) => item && typeof item === "object" && (item as { kind?: string; isCover?: boolean }).kind === "IMAGE" && (item as { isCover?: boolean }).isCover === true), message: t("products.error.coverRequired") }
  };
  props.modelValue.skus.forEach((_, index) => {
    rules[`skus.${index}.nameZhCn`] = { required: true, message: t("products.error.skuNameRequired", { index: index + 1 }) };
    rules[`skus.${index}.priceAmount`] = { required: true, min: 1, message: t("products.error.skuPriceRequired", { index: index + 1 }) };
  });
  props.modelValue.media.forEach((_, index) => { rules[`media.${index}.fileId`] = { required: true, message: t("products.error.mediaRequired", { index: index + 1 }) }; });
  return rules;
});
function addSku() { props.modelValue.skus.push({ code: `MC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, nameZhCn: "", optionValues: {}, priceAmount: 0, currency: "CNY", initialStock: 0 }); }
function removeSku(index: number) { if (props.modelValue.skus.length > 1) props.modelValue.skus.splice(index, 1); }
function addMedia() { props.modelValue.media.push({ fileId: "", kind: "IMAGE", sortOrder: props.modelValue.media.length, isCover: !props.modelValue.media.length }); }
function removeMedia(index: number) {
  if (props.modelValue.media.length <= 1) return;
  const wasCover = props.modelValue.media[index]?.isCover;
  props.modelValue.media.splice(index, 1);
  props.modelValue.media.forEach((item, current) => item.sortOrder = current);
  if (wasCover && props.modelValue.media[0]) props.modelValue.media[0].isCover = true;
}
function setCover(index: number) { props.modelValue.media.forEach((item, current) => item.isCover = current === index); }
function clearFile(index: number) { const media = props.modelValue.media[index]; if (media) media.fileId = ""; delete uploadErrors.value[index]; }
function formSubmitted() { validationError.value = ""; emit("save"); }
function formInvalid(errors: Record<string, string>) { validationError.value = Object.values(errors)[0] ?? ""; }
async function registerFile(index: number, file: File) {
  uploadingIndex.value = index;
  delete uploadErrors.value[index];
  try {
    const asset = await uploadFile<{ id: string }>("product-media", file);
    const media = props.modelValue.media[index];
    if (!media) return;
    media.fileId = asset.id;
    media.altZhCn ||= file.name.replace(/\.[^.]+$/, "");
  } catch {
    uploadErrors.value[index] = t("products.error.mediaUpload");
  } finally {
    uploadingIndex.value = null;
  }
}
</script>

<template>
  <div class="mask" @mousedown.self="emit('close')">
    <UiForm class="drawer" :model="modelValue" :rules="formRules" validate-on="blur" @submit="formSubmitted" @invalid="formInvalid">
      <header class="drawer-header">
        <div>
          <small>PRODUCT DRAFT</small>
          <h2>{{ editing ? t('products.drawerEditTitle') : t('products.drawerNewTitle') }}</h2>
          <p>{{ editable ? t('products.footerEditable') : t('products.footerReadOnly') }}</p>
        </div>
        <UiButton variant="ghost" :aria-label="t('products.closeAria')" @click="emit('close')">×</UiButton>
      </header>

      <div class="scroll">
        <div class="rules" :class="{ readonly: !editable }">
          <span aria-hidden="true">{{ editable ? '✓' : 'i' }}</span>
          <div>
            <b>{{ editable ? t('products.rulesTitle') : t('products.rulesReadOnlyTitle') }}</b>
            <p>{{ editable ? t('products.rulesSubmit') : t('products.rulesReadOnly') }}</p>
          </div>
        </div>
        <p v-if="validationError" class="validation-error" role="alert">{{ validationError }}</p>

        <section v-if="reviewEvents.length" class="history">
          <h3>{{ t('products.history') }}</h3>
          <article v-for="event in reviewEvents" :key="event.id">
            <div><b>{{ statusLabel(event.fromStatus) }} → {{ statusLabel(event.toStatus) }}</b><time>{{ formatDate(event.createdAt) }}</time></div>
            <p v-if="event.reason">{{ event.reason }}</p>
            <ul v-if="event.fieldFeedback.length"><li v-for="item in event.fieldFeedback" :key="`${item.field}-${item.message}`">{{ t('products.feedbackLine', { field: item.field, message: item.message }) }}</li></ul>
          </article>
        </section>

        <fieldset :disabled="!editable">
          <UiFormSection :title="t('products.baseInfo')" :description="t('products.rulesEditable')">
            <div class="form-grid">
              <UiField name="titleZhCn" :label="t('products.titleZhCn')" required><UiInput v-model="modelValue.titleZhCn" required maxlength="200" /></UiField>
              <UiField :label="t('products.titleEnUs')"><UiInput v-model="modelValue.titleEnUs" maxlength="200" /></UiField>
              <UiField name="categoryId" :label="t('products.category')" required><UiSelect v-model="modelValue.categoryId"><option value="">{{ t('products.draftNoSelection') }}</option><option v-for="item in catalog?.categories" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
              <UiField :label="t('products.brand')"><UiSelect v-model="modelValue.brandId"><option value="">{{ t('products.unselected') }}</option><option v-for="item in catalog?.brands" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
              <UiField :label="t('products.franchise')"><UiSelect v-model="modelValue.franchiseId"><option value="">{{ t('products.unselected') }}</option><option v-for="item in catalog?.franchises" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
              <UiField :label="t('products.character')"><UiSelect v-model="modelValue.characterId"><option value="">{{ t('products.unselected') }}</option><option v-for="item in characters" :key="item.id" :value="item.id">{{ catalogName(item) }}</option></UiSelect></UiField>
              <UiField :label="t('products.material')"><UiInput v-model="modelValue.material" :placeholder="t('products.materialPlaceholder')" /></UiField>
              <UiField :label="t('products.scale')"><UiInput v-model="modelValue.scale" :placeholder="t('products.scalePlaceholder')" /></UiField>
              <UiField :label="t('products.manufacturer')"><UiInput v-model="modelValue.manufacturer" /></UiField>
              <UiField :label="t('products.copyright')"><UiInput v-model="modelValue.copyrightNotice" /></UiField>
              <UiField :label="t('products.saleType')"><UiSelect v-model="modelValue.saleType"><option value="IN_STOCK">{{ t('products.saleTypeInStock') }}</option><option value="PREORDER">{{ t('products.saleTypePreorder') }}</option></UiSelect></UiField>
              <UiField class="wide" :label="t('products.afterSalesSummary')"><UiTextarea v-model="modelValue.afterSalesSummary" rows="2" /></UiField>
              <template v-if="modelValue.saleType === 'PREORDER'">
                <UiField class="wide" :label="t('products.presaleNotice')" required><UiTextarea v-model="modelValue.presaleNotice" rows="3" /></UiField>
                <UiField :label="t('products.shippingWindowStart')" required><UiInput v-model="modelValue.shippingWindowStart" type="date" /></UiField>
                <UiField :label="t('products.shippingWindowEnd')" required><UiInput v-model="modelValue.shippingWindowEnd" type="date" /></UiField>
              </template>
              <UiField name="descriptionZhCn" class="wide" :label="t('products.descriptionZhCn')" required><UiTextarea v-model="modelValue.descriptionZhCn" rows="4" /></UiField>
              <UiField class="wide" :label="t('products.descriptionEnUs')"><UiTextarea v-model="modelValue.descriptionEnUs" rows="3" /></UiField>
            </div>
          </UiFormSection>

          <UiFormSection :title="t('products.skuSection')" :description="t('products.rulesSubmit')">
            <template #actions><UiButton v-if="editable" size="sm" variant="secondary" @click="addSku">＋ {{ t('products.addSku') }}</UiButton></template>
            <div class="repeat-list">
              <article v-for="(sku, index) in modelValue.skus" :key="sku.id ?? sku.code ?? index" class="repeat-card">
                <header class="repeat-header">
                  <div><span>{{ String(index + 1).padStart(2, '0') }}</span><b>{{ sku.nameZhCn || t('products.skuName') }}</b></div>
                  <UiButton v-if="editable" size="sm" variant="danger" :disabled="modelValue.skus.length <= 1" @click="removeSku(index)">{{ t('products.removeSku') }}</UiButton>
                </header>
                <div class="form-grid compact">
                  <UiField :label="t('products.merchantCode')" :hint="t('products.merchantCodeHint')"><UiInput v-model="sku.code" /></UiField>
                  <UiField :name="`skus.${index}.nameZhCn`" :label="t('products.skuName')" required><UiInput v-model="sku.nameZhCn" required /></UiField>
                  <UiField :label="t('products.options')"><UiInput v-model="sku.optionValues['规格']" :placeholder="t('products.optionsPlaceholder')" /></UiField>
                  <UiField :label="t('products.barcode')"><UiInput v-model="sku.barcode" /></UiField>
                  <UiField :name="`skus.${index}.priceAmount`" :label="t('products.priceCents')" required><UiInput v-model="sku.priceAmount" type="number" min="1" /></UiField>
                  <UiField :label="t('products.initialStock')"><UiInput v-model="sku.initialStock" type="number" min="0" /></UiField>
                  <UiField :label="t('products.weightGrams')"><UiInput v-model="sku.weightGrams" type="number" min="0" /></UiField>
                  <UiField :label="t('products.dimensionsMm')"><div class="dimensions"><UiInput v-model="sku.lengthMm" type="number" min="0" :placeholder="t('products.length')" /><UiInput v-model="sku.widthMm" type="number" min="0" :placeholder="t('products.width')" /><UiInput v-model="sku.heightMm" type="number" min="0" :placeholder="t('products.height')" /></div></UiField>
                </div>
              </article>
            </div>
          </UiFormSection>

          <UiFormSection :title="t('products.mediaSection')" :description="t('products.selectImageHint')">
            <template #actions><UiButton v-if="editable" size="sm" variant="secondary" @click="addMedia">＋ {{ t('products.addMedia') }}</UiButton></template>
            <div class="repeat-list">
              <article v-for="(media, index) in modelValue.media" :key="media.id ?? `${media.fileId}-${index}`" class="repeat-card media-card">
                <header class="repeat-header">
                  <div><span>{{ String(index + 1).padStart(2, '0') }}</span><b>{{ media.isCover ? t('products.currentCover') : t('products.image') }}</b></div>
                  <UiButton v-if="editable" size="sm" variant="danger" :disabled="modelValue.media.length <= 1" @click="removeMedia(index)">{{ t('products.remove') }}</UiButton>
                </header>
                <div class="media-grid">
                  <UiField :name="`media.${index}.fileId`" class="upload-field" :label="t('products.selectImage')" required>
                    <UiFileUpload
                      accept="image/jpeg,image/png,image/webp"
                      :current-name="media.fileId"
                      :placeholder="t('products.fileIdPlaceholder')"
                      :hint="t('products.selectImageHint')"
                      :busy="uploadingIndex === index"
                      :disabled="!editable"
                      :error="uploadErrors[index]"
                      :browse-label="t('products.browse')"
                      :drop-hint="t('products.uploadDropHint')"
                      :uploading-label="t('products.uploading')"
                      :uploading-hint="t('products.uploadingHint')"
                      :clear-label="t('products.clearFile')"
                      @select="registerFile(index, $event)"
                      @clear="clearFile(index)"
                    />
                  </UiField>
                  <UiField :label="t('products.mediaType')"><UiSelect v-model="media.kind"><option value="IMAGE">{{ t('products.image') }}</option><option value="VIDEO">{{ t('products.videoReserved') }}</option></UiSelect></UiField>
                  <UiField :label="t('products.altZhCn')"><UiInput v-model="media.altZhCn" /></UiField>
                  <UiField :label="t('products.sortOrder')"><UiInput v-model="media.sortOrder" type="number" min="0" /></UiField>
                </div>
                <div class="media-actions"><UiButton size="sm" :variant="media.isCover ? 'primary' : 'secondary'" :disabled="media.isCover" @click="setCover(index)">{{ media.isCover ? t('products.currentCover') : t('products.setCover') }}</UiButton></div>
              </article>
            </div>
          </UiFormSection>
        </fieldset>
      </div>

      <footer class="drawer-footer">
        <span>{{ editable ? t('products.footerEditable') : t('products.footerReadOnly') }}</span>
        <UiButton variant="secondary" @click="emit('close')">{{ t('products.close') }}</UiButton>
        <UiButton v-if="editable" type="submit" :loading="busy">{{ t('products.saveDraft') }}</UiButton>
      </footer>
    </UiForm>
  </div>
</template>

<style scoped lang="less">
.mask{position:fixed;z-index:110;inset:0;display:flex;justify-content:flex-end;background:rgb(23 20 35 / 58%);backdrop-filter:blur(2px)}
.drawer{display:flex;width:min(940px,100vw);height:100%;flex-direction:column;background:var(--app-bg,#f5f6fb);color:var(--text);box-shadow:-18px 0 52px rgb(28 31 48 / 18%)}
.drawer-header{display:flex;flex:0 0 auto;align-items:flex-start;justify-content:space-between;padding:22px 26px;border-bottom:1px solid var(--border);background:var(--surface)}
.drawer-header small{color:var(--accent);font-size:9px;font-weight:750;letter-spacing:.14em}.drawer-header h2{margin:6px 0 2px;font-size:22px;letter-spacing:0}.drawer-header p{margin:0;color:var(--text-muted);font-size:10px}
.scroll{display:grid;flex:1;gap:16px;overflow:auto;padding:20px 24px 32px;overscroll-behavior:contain}
.rules{display:flex;align-items:flex-start;gap:11px;padding:13px 15px;border:1px solid color-mix(in srgb,var(--accent) 22%,var(--border));border-radius:10px;background:color-mix(in srgb,var(--accent-soft) 68%,var(--surface));font-size:11px}.rules>span{display:grid;flex:0 0 auto;width:24px;height:24px;place-items:center;border-radius:7px;background:var(--accent);color:#fff;font-weight:750}.rules b{color:var(--text)}.rules p{margin:3px 0 0;color:var(--text-secondary);line-height:1.5}.rules.readonly{border-color:var(--border);background:var(--surface-raised)}.rules.readonly>span{background:var(--text-muted)}
.validation-error{padding:10px 13px;margin:0;border:1px solid color-mix(in srgb,var(--danger) 25%,var(--border));border-radius:9px;background:var(--danger-soft);color:var(--danger);font-size:11px}
.history{padding:16px 18px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.history>h3{margin:0 0 10px;font-size:14px}.history article{padding:11px 0;border-top:1px solid var(--border)}.history article:first-of-type{border-top:0}.history article div{display:flex;justify-content:space-between;gap:14px}.history time{color:var(--text-muted);font-size:9px}.history p,.history ul{margin:7px 0 0;color:var(--text-secondary);font-size:11px;line-height:1.55}
fieldset{display:grid;gap:16px;padding:0;margin:0;border:0}fieldset:disabled{opacity:.72}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 16px}.form-grid.compact{align-items:start;padding:16px}.wide{grid-column:1/-1}.dimensions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.repeat-list{display:grid;gap:12px}.repeat-card{overflow:hidden;border:1px solid var(--border);border-radius:11px;background:color-mix(in srgb,var(--surface-raised) 58%,var(--surface));box-shadow:0 3px 10px rgb(31 45 74 / 4%)}
.repeat-header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 14px;border-bottom:1px solid var(--border);background:var(--surface)}.repeat-header>div{display:flex;align-items:center;gap:9px}.repeat-header span{display:grid;width:26px;height:26px;place-items:center;border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:9px;font-weight:750}.repeat-header b{font-size:12px}
.media-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(130px,.7fr) minmax(0,1fr) 100px;gap:14px;padding:16px}.upload-field{grid-row:span 2}.media-actions{display:flex;justify-content:flex-end;padding:0 16px 16px}
.drawer-footer{display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border);background:var(--surface);box-shadow:0 -8px 22px rgb(31 45 74 / 6%)}.drawer-footer>span{margin-right:auto;color:var(--text-muted);font-size:10px}
@media(max-width:760px){.drawer{width:100vw}.scroll{padding:16px}.form-grid,.media-grid{grid-template-columns:1fr}.wide,.upload-field{grid-column:auto;grid-row:auto}.drawer-footer>span{display:none}}
@media(max-width:480px){.drawer-header{padding:18px}.repeat-header{align-items:flex-start}.dimensions{grid-template-columns:1fr}.drawer-footer{padding:12px 16px}.drawer-footer :deep(button){flex:1}}
</style>
