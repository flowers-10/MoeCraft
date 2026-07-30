<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { JobView, UserRole } from "@moecraft/shared";
import { UiBadge, UiButton, UiPageContainer, UiPageHeader, UiTable, type UiTableColumn } from "@moecraft/ui";
import { apiRequest } from "../../../api";
const props=withDefaults(defineProps<{roles?:UserRole[]}>(),{roles:()=>[]});
const jobs=ref<JobView[]>([]),loading=ref(false),error=ref("");
const columns:UiTableColumn[]=[{key:"type",label:"任务"},{key:"attempts",label:"尝试"},{key:"runAt",label:"下次执行"},{key:"error",label:"最近错误"},{key:"status",label:"状态"},{key:"actions",label:"操作",align:"right"}];
async function load(){loading.value=true;error.value="";try{jobs.value=await apiRequest<JobView[]>("/admin/jobs/failed");}catch{error.value="失败任务加载失败。";}finally{loading.value=false;}}
async function replay(id:string){try{await apiRequest<JobView>(`/admin/jobs/${id}/replay`,{method:"POST"});await load();}catch{error.value="重放失败，仅平台管理员可重放死信任务。";}}
onMounted(load);
</script>
<template><UiPageContainer size="full" class="jobs content-scroll"><UiPageHeader eyebrow="DURABLE JOBS" title="失败任务" description="查看重试与死信；重放会再次执行副作用，仅平台管理员可操作。"><template #actions><UiButton variant="secondary" @click="load">刷新</UiButton></template></UiPageHeader><p v-if="error" class="notice">{{error}}</p><section class="panel"><div v-if="loading" class="loading">正在加载…</div><UiTable v-else :columns="columns" :rows="jobs.map(job=>({...job,error:job.lastError??'—',actions:job.id}))" empty-text="当前没有失败任务"><template #cell-attempts="{row}">{{row.attempts}} / {{row.maxAttempts}}</template><template #cell-runAt="{row}">{{new Date(String(row.runAt)).toLocaleString()}}</template><template #cell-status="{row}"><UiBadge :tone="row.status==='DEAD_LETTER'?'danger':'warning'">{{row.status}}</UiBadge></template><template #cell-actions="{row}"><UiButton v-if="props.roles.includes('PLATFORM_ADMIN')&&row.status==='DEAD_LETTER'" size="sm" variant="ghost" @click="replay(String(row.id))">重放</UiButton><span v-else>只读</span></template></UiTable></section></UiPageContainer></template>
<style scoped lang="less">.jobs{background:var(--app-bg)}.panel{padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}.notice{padding:10px;background:var(--danger-soft);color:var(--danger)}.loading{padding:50px;text-align:center}</style>
