<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { UiBadge, UiButton, UiCard, UiEmptyState, UiField, UiInput, UiList, UiPageContainer, UiPageHeader, UiSelect, UiSplitLayout, UiTable, UiTextarea } from "../../src";
import { componentDocs, tokens, type ComponentDoc } from "./catalog";

const query=ref("");const dark=ref(localStorage.getItem("mc-ui-doc-theme")==="dark");const menuOpen=ref(false);const copied=ref("");
const activeTabs=reactive<Record<string,"props"|"slots"|"events"|"usage">>({});
const form=reactive({name:"Moe Atelier",description:"专注原创手办与限定周边。",status:"OPEN"});
const members=[{id:"1",name:"Acceptance User",role:"OWNER"},{id:"2",name:"Moe Staff",role:"STAFF"}];
const columns=[{key:"name",label:"成员"},{key:"role",label:"角色"}];
const groups=computed(()=>[...new Set(componentDocs.map(item=>item.group))]);
const filtered=computed(()=>{const value=query.value.trim().toLowerCase();return value?componentDocs.filter(item=>JSON.stringify(item).toLowerCase().includes(value)):componentDocs});
function toggleTheme(){dark.value=!dark.value;document.documentElement.dataset.theme=dark.value?"dark":"";localStorage.setItem("mc-ui-doc-theme",dark.value?"dark":"light")}
async function copy(value:string,name:string){await navigator.clipboard?.writeText(value);copied.value=name;window.setTimeout(()=>copied.value="",1200)}
function rows(doc:ComponentDoc){const tab=activeTabs[doc.name]??"props";return tab==="props"?doc.props:tab==="slots"?doc.slots:doc.events}
if(dark.value)document.documentElement.dataset.theme="dark";
</script>

<template>
  <aside class="sidebar" :class="{open:menuOpen}"><a class="brand" href="#top"><span>M</span><div><b>MoeCraft UI</b><small>DESIGN SYSTEM · 0.1</small></div></a><label class="search"><span>⌕</span><input v-model="query" type="search" placeholder="搜索组件、属性…"/></label><nav><template v-for="group in groups" :key="group"><small>{{group}}</small><a v-for="item in componentDocs.filter(x=>x.group===group)" :key="item.name" :href="`#${item.name}`" @click="menuOpen=false">{{item.name}}</a></template></nav><div class="side-footer"><span class="status-dot"/>Vue 3 · TypeScript</div></aside>
  <main id="top"><header class="topbar"><button @click="menuOpen=!menuOpen">☰</button><span>组件文档</span><div><button title="切换主题" @click="toggleTheme">◐</button><a href="../src/index.ts">查看源码 ↗</a></div></header>
    <section class="hero"><div><span class="eyebrow">MOECRAFT DESIGN LANGUAGE</span><h1>一致、清晰、可复用的<br/><em>商城 UI 基础设施</em></h1><p>面向运营后台与商城前台的 Vue 3 组件库。统一交互状态、视觉令牌和 TypeScript 接口，让业务页面只关注业务。</p><div class="hero-actions"><a class="primary" href="#getting-started">开始使用</a><a href="#components">浏览组件</a></div></div><UiCard class="hero-card"><div class="mini-row"><span class="avatar">M</span><div><b>G11 Acceptance Studio</b><small>Active merchant</small></div><UiBadge tone="success">营业中</UiBadge></div><div class="mini-fields"><UiField label="店铺名称"><UiInput v-model="form.name"/></UiField><UiField label="状态"><UiSelect v-model="form.status"><option value="OPEN">营业中</option><option value="CLOSED">暂停营业</option></UiSelect></UiField></div><UiButton style="width:100%;margin-top:15px">保存店铺资料</UiButton></UiCard></section>
    <section id="getting-started" class="intro section-block"><div class="section-title"><span>01</span><div><small>GETTING STARTED</small><h2>开始使用</h2></div></div><div class="install-grid"><article><h3>安装工作区依赖</h3><pre><code>pnpm --filter your-app add @moecraft/ui@workspace:*</code><button class="copy" @click="copy('pnpm --filter your-app add @moecraft/ui@workspace:*','install')">{{copied==='install'?'已复制':'复制'}}</button></pre></article><article><h3>按需引入</h3><pre><code>import { UiButton, UiCard } from "@moecraft/ui";</code><button class="copy" @click="copy('import { UiButton, UiCard } from &quot;@moecraft/ui&quot;;','import')">{{copied==='import'?'已复制':'复制'}}</button></pre></article></div><div class="notice"><b>样式约定</b><p>组件颜色读取 CSS Variables，可适配后台明暗主题；商城可覆盖同名变量形成品牌皮肤。</p></div></section>
    <section id="tokens" class="section-block"><div class="section-title"><span>02</span><div><small>FOUNDATIONS</small><h2>设计令牌</h2></div></div><div class="token-grid"><article v-for="token in tokens" :key="token[2]" class="token"><div class="swatch" :style="{background:token[1]}"/><b>{{token[0]}}</b><code>{{token[2]}}</code></article></div></section>
    <section id="components" class="section-block"><div class="section-title"><span>03</span><div><small>COMPONENTS</small><h2>组件参考</h2></div></div><div id="component-list"><article v-for="doc in filtered" :id="doc.name" :key="doc.name" class="component-card"><div class="component-head"><div><h3>{{doc.name}}</h3><p>{{doc.description}}</p></div><code>import { {{doc.name}} } from "@moecraft/ui"</code></div><div class="preview"><div class="demo-stack">
      <template v-if="doc.name==='UiButton'"><UiButton>保存</UiButton><UiButton variant="secondary">取消</UiButton><UiButton variant="danger">删除</UiButton></template>
      <template v-else-if="doc.name==='UiBadge'"><UiBadge tone="success">营业中</UiBadge><UiBadge tone="accent">审核中</UiBadge><UiBadge tone="danger">已停用</UiBadge></template>
      <UiInput v-else-if="doc.name==='UiInput'" v-model="form.name" style="max-width:360px"/>
      <UiTextarea v-else-if="doc.name==='UiTextarea'" v-model="form.description" rows="3" style="max-width:420px"/>
      <UiSelect v-else-if="doc.name==='UiSelect'" v-model="form.status" style="max-width:260px"><option value="OPEN">营业中</option><option value="CLOSED">暂停营业</option></UiSelect>
      <UiField v-else-if="doc.name==='UiField'" label="客服邮箱" hint="用于接收买家咨询" required style="width:340px"><UiInput model-value="hello@moecraft.test"/></UiField>
      <UiCard v-else-if="doc.name==='UiCard'" title="店铺资料" subtitle="维护公开展示的信息" style="width:380px"><UiBadge tone="success">已保存</UiBadge></UiCard>
      <UiList v-else-if="doc.name==='UiList'" :items="members" :key-by="item=>item.id" style="width:360px"><template #default="{item}"><b>{{item.name}}</b> · {{item.role}}</template></UiList>
      <UiTable v-else-if="doc.name==='UiTable'" :columns="columns" :rows="members" style="width:520px"/>
      <UiEmptyState v-else-if="doc.name==='UiEmptyState'" title="暂无团队成员" description="邀请成员后会显示在这里"/>
      <UiPageContainer v-else-if="doc.name==='UiPageContainer'" style="border:1px dashed var(--accent);text-align:center">Page content · 1280px</UiPageContainer>
      <UiPageHeader v-else-if="doc.name==='UiPageHeader'" eyebrow="STORE OPERATIONS" title="店铺与成员" description="管理公开资料和团队权限" style="width:100%"/>
      <UiSplitLayout v-else aside-width="140px" style="width:100%"><div style="height:70px;background:var(--accent-soft);border-radius:8px"/><template #aside><div style="height:70px;border:1px solid var(--border);border-radius:8px"/></template></UiSplitLayout>
    </div></div><div class="api"><div class="tabs"><button v-for="tab in ['props','slots','events','usage'] as const" :key="tab" :class="{active:(activeTabs[doc.name]??'props')===tab}" @click="activeTabs[doc.name]=tab">{{tab==='usage'?'Usage':tab[0].toUpperCase()+tab.slice(1)}}</button></div><pre v-if="activeTabs[doc.name]==='usage'" class="usage"><code>{{doc.usage}}</code><button class="copy" @click="copy(doc.usage,doc.name)">{{copied===doc.name?'已复制':'复制'}}</button></pre><table v-else class="api-table"><thead><tr><th>名称</th><th>类型</th><th>默认值</th><th>说明</th></tr></thead><tbody><tr v-for="item in rows(doc)" :key="item.name"><td><code>{{item.name}}</code></td><td>{{item.type}}</td><td>{{item.defaultValue}}</td><td>{{item.description}}</td></tr><tr v-if="!rows(doc).length"><td colspan="4">无</td></tr></tbody></table></div></article></div><div v-if="!filtered.length" id="empty-search"><h3>没有匹配的组件</h3><p>尝试搜索 button、表格、modelValue 或 slot。</p></div></section>
    <footer>Built for MoeCraft · Vue 3 + TypeScript · Keyboard accessible</footer>
  </main>
</template>
