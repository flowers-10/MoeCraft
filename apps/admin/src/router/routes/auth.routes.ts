import type { RouteRecordRaw } from "vue-router";
export const authRoutes:RouteRecordRaw[]=[{path:"/login",name:"login",component:()=>import("../../views/auth/LoginView.vue"),meta:{public:true,titleKey:"auth.login"}}];
