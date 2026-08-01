import { computed, ref } from "vue";
import type { CouponType, CouponView } from "@moecraft/shared";
import { apiRequest, type ApiError } from "../../../../api";

export type CouponDraft = {
  name: string; type: CouponType; value: string; minimumAmount: string;
  startsAt: string; endsAt: string; totalLimit: number; perUserLimit: number; productIds: string;
};

export const emptyCouponDraft = (): CouponDraft => ({
  name: "", type: "FIXED", value: "", minimumAmount: "0.00",
  startsAt: "", endsAt: "", totalLimit: 100, perUserLimit: 1, productIds: ""
});

export function usePromotionManagement() {
  const coupons = ref<CouponView[]>([]);
  const loading = ref(false);
  const busy = ref(false);
  const error = ref("");
  const dialogOpen = ref(false);
  const totals = computed(() => coupons.value.reduce((sum, coupon) => ({
    claimed: sum.claimed + coupon.claimedCount,
    used: sum.used + coupon.usedCount,
    discount: sum.discount + Number(coupon.discountTotal)
  }), { claimed: 0, used: 0, discount: 0 }));

  const message = (cause: unknown) => {
    const error = cause as Partial<ApiError>;
    return ({
      COUPON_PRODUCT_SCOPE_INVALID: "适用商品必须属于当前店铺。",
      COUPON_PERIOD_INVALID: "结束时间必须晚于开始时间。",
      COUPON_PERCENTAGE_INVALID: "百分比优惠必须在 0–100 之间。"
    }[error.message ?? error.code ?? ""] ?? "优惠活动操作失败，请检查填写内容与权限。");
  };
  async function load() {
    loading.value = true; error.value = "";
    try { coupons.value = await apiRequest<CouponView[]>("/merchant/promotions"); }
    catch (cause) { error.value = message(cause); }
    finally { loading.value = false; }
  }
  async function create(draft: CouponDraft) {
    busy.value = true; error.value = "";
    try {
      await apiRequest<CouponView>("/merchant/promotions", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          startsAt: new Date(draft.startsAt).toISOString(),
          endsAt: new Date(draft.endsAt).toISOString(),
          productIds: draft.productIds.split(",").map((id) => id.trim()).filter(Boolean)
        })
      });
      dialogOpen.value = false;
      await load();
    } catch (cause) { error.value = message(cause); }
    finally { busy.value = false; }
  }
  async function toggle(coupon: CouponView) {
    busy.value = true; error.value = "";
    try {
      await apiRequest(`/merchant/promotions/${coupon.id}/status`, { method: "PATCH", body: JSON.stringify({ status: coupon.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }) });
      await load();
    } catch (cause) { error.value = message(cause); }
    finally { busy.value = false; }
  }
  return { coupons, loading, busy, error, dialogOpen, totals, load, create, toggle };
}
