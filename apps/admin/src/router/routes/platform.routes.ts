import type { RouteRecordRaw } from "vue-router";
export const platformRoutes:RouteRecordRaw[]=[{path:"/platform",component:()=>import("../../views/platform/PlatformLayout.vue"),meta:{domain:"platform",roles:["PLATFORM_ADMIN","PLATFORM_OPERATOR","CUSTOMER"]},children:[{path:"merchant-applications",name:"onboarding",component:()=>import("../../views/platform/merchant-applications/MerchantApplicationsView.vue"),meta:{titleKey:"nav.onboarding",accessKey:"platform.onboarding"}}]}];

