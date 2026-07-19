import { computed, ref } from "vue";
import type { ProductDraftListItem, ProductFieldFeedback, ProductReviewDetail } from "@moecraft/shared";
import { apiRequest } from "../../../../api";

export function useProductReviews(){
  const items=ref<ProductDraftListItem[]>([]);const selected=ref<ProductReviewDetail|null>(null);const status=ref("PENDING_REVIEW");const loading=ref(false);const busy=ref(false);const error=ref("");const reason=ref("");const fieldFeedback=ref<ProductFieldFeedback[]>([]);
  const pendingCount=computed(()=>items.value.filter(item=>item.status==="PENDING_REVIEW").length);
  async function load(){loading.value=true;error.value="";try{items.value=await apiRequest<ProductDraftListItem[]>(`/platform/product-reviews?status=${status.value}`);}catch(e){error.value=(e as{message?:string}).message??"审核列表加载失败";}finally{loading.value=false;}}
  async function open(id:string){busy.value=true;error.value="";try{selected.value=await apiRequest<ProductReviewDetail>(`/platform/product-reviews/${id}`);reason.value="";fieldFeedback.value=[];}catch(e){error.value=(e as{message?:string}).message??"商品详情加载失败";}finally{busy.value=false;}}
  function addFeedback(){fieldFeedback.value.push({field:"",message:""});}
  async function decide(approved:boolean){if(!selected.value)return;if(!approved&&!reason.value.trim()&&!fieldFeedback.value.some(item=>item.message.trim())){error.value="驳回时必须填写总体原因或至少一条字段意见。";return;}busy.value=true;error.value="";try{await apiRequest(`/platform/product-reviews/${selected.value.id}/decision`,{method:"POST",body:JSON.stringify({approved,reason:reason.value||undefined,fieldFeedback:fieldFeedback.value.filter(item=>item.field.trim()&&item.message.trim())})});selected.value=null;await load();}catch(e){error.value=(e as{message?:string}).message??"审核操作失败";}finally{busy.value=false;}}
  return{items,selected,status,loading,busy,error,reason,fieldFeedback,pendingCount,load,open,addFeedback,decide};
}
