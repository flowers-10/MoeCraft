import { computed, ref } from "vue";
import type { OrderExportTaskView, OrderListItem, OrderStatus, OrderView } from "@moecraft/shared";
import { apiRequest } from "../../../../api";

export function useOrderManagement(){
  const orders=ref<OrderListItem[]>([]),selected=ref<OrderView|null>(null),loading=ref(false),busy=ref(false),error=ref(""),status=ref<OrderStatus|"" >(""),search=ref("");
  const query=computed(()=>{const params=new URLSearchParams();if(status.value)params.set("status",status.value);if(search.value.trim())params.set("search",search.value.trim());return params.toString();});
  async function load(){loading.value=true;error.value="";try{orders.value=await apiRequest<OrderListItem[]>(`/admin/orders${query.value?`?${query.value}`:""}`);}catch{error.value="订单加载失败，请检查权限或 API 状态。";}finally{loading.value=false;}}
  async function open(id:string){busy.value=true;try{selected.value=await apiRequest<OrderView>(`/admin/orders/${id}`);}catch{error.value="无法读取订单详情。";}finally{busy.value=false;}}
  async function saveNote(merchantOrderId:string,note:string){if(!selected.value)return;busy.value=true;try{selected.value=await apiRequest<OrderView>(`/admin/orders/${selected.value.id}/merchant-orders/${merchantOrderId}/note`,{method:"PATCH",body:JSON.stringify({note})});}catch{error.value="备注保存失败，请检查订单数据域和按钮权限。";}finally{busy.value=false;}}
  async function createExport(){busy.value=true;try{const task=await apiRequest<OrderExportTaskView>("/admin/orders/exports",{method:"POST",body:JSON.stringify({status:status.value||undefined,search:search.value||undefined})});error.value=`导出任务 ${task.id} 已进入队列。`;}catch{error.value="创建导出任务失败。";}finally{busy.value=false;}}
  return{orders,selected,loading,busy,error,status,search,load,open,saveNote,createExport};
}
