<script setup lang="ts">
import { computed } from "vue";
import { UiButton,UiField,UiInput,UiSelect,UiTextarea } from "@moecraft/ui";
import type { CatalogOverview,ProductDraftInput,ProductReviewEventView } from "@moecraft/shared";
import { apiRequest } from "../../../../api";

const props=defineProps<{modelValue:ProductDraftInput;catalog:CatalogOverview|null;reviewEvents:ProductReviewEventView[];editing:boolean;editable:boolean;busy:boolean}>();
const emit=defineEmits<{close:[];save:[]}>();
const characters=computed(()=>props.catalog?.characters.filter(item=>!props.modelValue.franchiseId||item.franchiseId===props.modelValue.franchiseId)??[]);
function addSku(){props.modelValue.skus.push({code:`MC-${crypto.randomUUID().slice(0,8).toUpperCase()}`,nameZhCn:"",optionValues:{},priceAmount:0,currency:"CNY",initialStock:0});}
function addMedia(){props.modelValue.media.push({fileId:"",kind:"IMAGE",sortOrder:props.modelValue.media.length,isCover:!props.modelValue.media.length});}
function cover(index:number){props.modelValue.media.forEach((item,current)=>item.isCover=current===index);}
async function registerFile(index:number,event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;const asset=await apiRequest<{id:string}>("/files",{method:"POST",body:JSON.stringify({purpose:"product-media",fileName:file.name,mimeType:file.type,sizeBytes:file.size})});props.modelValue.media[index]!.fileId=asset.id;props.modelValue.media[index]!.altZhCn ||= file.name.replace(/\.[^.]+$/,"");}
</script>

<template>
  <div class="mask" @mousedown.self="emit('close')">
    <form class="drawer" @submit.prevent="emit('save')">
      <header>
        <div><small>PRODUCT DRAFT</small><h2>{{editing?'商品资料':'新建商品草稿'}}</h2></div>
        <UiButton variant="ghost" aria-label="关闭" @click="emit('close')">×</UiButton>
      </header>
      <div class="scroll">
        <aside><b>{{editable?'填写规则':'当前状态只读'}}</b><p v-if="editable"><strong>*</strong> 为草稿必填。商品 ID、状态和时间由系统生成；SKU 编码自动生成且可修改，币种默认 CNY。</p><p v-else>待审核和在售状态不可直接修改；在售商品需先下架，审核结果变更后才能继续编辑。</p><p v-if="editable">提交审核时还需类目、中文描述、有效 SKU/价格和图片封面。</p></aside>
        <section v-if="reviewEvents.length" class="history">
          <h3>审核与状态记录</h3>
          <article v-for="event in reviewEvents" :key="event.id">
            <div><b>{{event.fromStatus}} → {{event.toStatus}}</b><time>{{new Date(event.createdAt).toLocaleString()}}</time></div>
            <p v-if="event.reason">{{event.reason}}</p>
            <ul v-if="event.fieldFeedback.length"><li v-for="item in event.fieldFeedback" :key="`${item.field}-${item.message}`"><strong>{{item.field}}</strong>：{{item.message}}</li></ul>
          </article>
        </section>
        <fieldset :disabled="!editable">
          <h3>基础资料</h3>
          <div class="grid">
            <UiField label="中文标题" required><UiInput v-model="modelValue.titleZhCn" required maxlength="200"/></UiField>
            <UiField label="英文标题"><UiInput v-model="modelValue.titleEnUs" maxlength="200"/></UiField>
            <UiField label="类目"><UiSelect v-model="modelValue.categoryId"><option value="">草稿暂不选择</option><option v-for="item in catalog?.categories" :key="item.id" :value="item.id">{{item.nameZhCn}}</option></UiSelect></UiField>
            <UiField label="品牌"><UiSelect v-model="modelValue.brandId"><option value="">未选择</option><option v-for="item in catalog?.brands" :key="item.id" :value="item.id">{{item.nameZhCn}}</option></UiSelect></UiField>
            <UiField label="作品 IP"><UiSelect v-model="modelValue.franchiseId"><option value="">未选择</option><option v-for="item in catalog?.franchises" :key="item.id" :value="item.id">{{item.nameZhCn}}</option></UiSelect></UiField>
            <UiField label="角色"><UiSelect v-model="modelValue.characterId"><option value="">未选择</option><option v-for="item in characters" :key="item.id" :value="item.id">{{item.nameZhCn}}</option></UiSelect></UiField>
            <UiField label="材质"><UiInput v-model="modelValue.material" placeholder="PVC、ABS…"/></UiField>
            <UiField label="比例"><UiInput v-model="modelValue.scale" placeholder="1/7、无比例…"/></UiField>
            <UiField label="厂商"><UiInput v-model="modelValue.manufacturer"/></UiField>
            <UiField label="版权信息"><UiInput v-model="modelValue.copyrightNotice"/></UiField>
            <UiField class="full" label="中文描述"><UiTextarea v-model="modelValue.descriptionZhCn" rows="4"/></UiField>
            <UiField class="full" label="英文描述"><UiTextarea v-model="modelValue.descriptionEnUs" rows="3"/></UiField>
          </div>
          <div class="section-title"><h3>SKU 规格</h3><UiButton v-if="editable" size="sm" variant="secondary" @click="addSku">＋ 添加 SKU</UiButton></div>
          <article v-for="(sku,index) in modelValue.skus" :key="index" class="repeat">
            <div class="grid"><UiField label="商家编码" hint="留空时后端自动生成"><UiInput v-model="sku.code"/></UiField><UiField label="规格名称" required><UiInput v-model="sku.nameZhCn" required/></UiField><UiField label="规格组合"><UiInput v-model="sku.optionValues['规格']" placeholder="标准版 / 限定版"/></UiField><UiField label="条码"><UiInput v-model="sku.barcode"/></UiField><UiField label="价格（分）"><UiInput v-model="sku.priceAmount" type="number" min="0"/></UiField><UiField label="初始库存"><UiInput v-model="sku.initialStock" type="number" min="0"/></UiField><UiField label="重量（克）"><UiInput v-model="sku.weightGrams" type="number" min="0"/></UiField><UiField label="尺寸（毫米）"><div class="dimensions"><UiInput v-model="sku.lengthMm" type="number" min="0" placeholder="长"/><UiInput v-model="sku.widthMm" type="number" min="0" placeholder="宽"/><UiInput v-model="sku.heightMm" type="number" min="0" placeholder="高"/></div></UiField></div>
            <UiButton v-if="editable" size="sm" variant="ghost" @click="modelValue.skus.splice(index,1)">移除 SKU</UiButton>
          </article>
          <div class="section-title"><h3>媒体</h3><UiButton v-if="editable" size="sm" variant="secondary" @click="addMedia">＋ 添加媒体</UiButton></div>
          <article v-for="(media,index) in modelValue.media" :key="index" class="repeat media"><UiField label="选择图片" required hint="当前登记文件元数据；对象存储适配器接入后上传原文件"><input v-if="editable" type="file" accept="image/jpeg,image/png,image/webp" @change="registerFile(index,$event)"><UiInput v-model="media.fileId" required readonly placeholder="选择文件后自动生成 File ID"/></UiField><UiField label="类型"><UiSelect v-model="media.kind"><option value="IMAGE">图片</option><option value="VIDEO">视频（预留）</option></UiSelect></UiField><UiField label="中文 Alt"><UiInput v-model="media.altZhCn"/></UiField><UiField label="排序"><UiInput v-model="media.sortOrder" type="number" min="0"/></UiField><div v-if="editable" class="media-actions"><UiButton size="sm" :variant="media.isCover?'primary':'secondary'" @click="cover(index)">{{media.isCover?'当前封面':'设为封面'}}</UiButton><UiButton size="sm" variant="ghost" @click="modelValue.media.splice(index,1)">移除</UiButton></div></article>
        </fieldset>
      </div>
      <footer><span>{{editable?'保存草稿不会自动提交审核':'关闭后可执行当前状态允许的操作'}}</span><UiButton variant="secondary" @click="emit('close')">关闭</UiButton><UiButton v-if="editable" type="submit" :loading="busy">保存草稿</UiButton></footer>
    </form>
  </div>
</template>

<style scoped lang="less">.mask{position:fixed;z-index:110;inset:0;display:flex;justify-content:flex-end;background:#1714238c}.drawer{display:flex;width:min(880px,96vw);height:100%;flex-direction:column;background:var(--surface);color:var(--text)}.drawer>header{display:flex;justify-content:space-between;padding:22px 28px;border-bottom:1px solid var(--border)}header small{color:var(--accent);font-size:9px;letter-spacing:.16em}header h2{margin:7px 0}.scroll{flex:1;overflow:auto;padding:22px 28px}.scroll>aside{padding:14px 16px;border:1px solid #d8d0ff;border-radius:11px;background:var(--accent-soft);font-size:11px;line-height:1.65}.scroll>aside p{margin:5px 0}.scroll>aside strong{color:var(--danger)}.history{margin-top:18px}.history article{padding:12px;margin-top:8px;border:1px solid var(--border);border-radius:10px}.history article div{display:flex;justify-content:space-between}.history time{color:var(--text-muted);font-size:9px}.history p,.history ul{margin:8px 0 0;font-size:11px;line-height:1.6}fieldset{padding:0;border:0}fieldset:disabled{opacity:.72}h3{margin:25px 0 13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.full{grid-column:1/-1}.section-title{display:flex;align-items:center;justify-content:space-between}.repeat{padding:15px;margin-bottom:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface-raised)}.repeat>button{margin-top:10px}.dimensions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.media{display:grid;grid-template-columns:2fr 1fr 2fr 100px;gap:10px}.media-actions{display:flex;grid-column:1/-1;gap:8px}.drawer>footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 28px;border-top:1px solid var(--border)}.drawer>footer span{margin-right:auto;color:var(--text-muted);font-size:10px}@media(max-width:650px){.grid,.media{grid-template-columns:1fr}.full{grid-column:auto}.drawer>footer span{display:none}}</style>
