import "vue-router";
import type { UserRole } from "@moecraft/shared";
declare module "vue-router" { interface RouteMeta { public?:boolean; roles?:UserRole[]; domain?:"platform"|"merchant"|"commerce"|"system"; titleKey?:string } }
export {};
