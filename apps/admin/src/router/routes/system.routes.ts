import type { RouteRecordRaw } from "vue-router";
export const systemRoutes:RouteRecordRaw[]=[{path:"/system",component:()=>import("../../views/system/SystemLayout.vue"),meta:{domain:"system"},children:[{path:"overview",name:"overview",component:()=>import("../../views/common/PlaceholderView.vue"),meta:{titleKey:"nav.overview",accessKey:"system.overview"}}]}];
