import type { UserRole } from "@moecraft/shared";
import type { MessageKey } from "../i18n";
export type NavigationNode={id:string;label:MessageKey;icon:string;routeName?:string;roles?:UserRole[];children?:NavigationNode[]};
const merchantRoles:UserRole[]=["MERCHANT_OWNER","MERCHANT_STAFF"];
const platformRoles:UserRole[]=["PLATFORM_ADMIN","PLATFORM_OPERATOR","CUSTOMER"];
export const navigationTree:NavigationNode[]=[
 {id:"system",label:"nav.system",icon:"⌂",children:[{id:"overview",label:"nav.overview",icon:"·",routeName:"overview"}]},
 {id:"platform",label:"nav.platform",icon:"◇",roles:platformRoles,children:[{id:"onboarding",label:"nav.onboarding",icon:"·",routeName:"onboarding",roles:platformRoles}]},
 {id:"merchant",label:"nav.merchant",icon:"♙",roles:merchantRoles,children:[{id:"settings",label:"nav.storeProfile",icon:"·",routeName:"settings",roles:merchantRoles},{id:"members",label:"nav.members",icon:"·",routeName:"members",roles:merchantRoles}]},
 {id:"commerce",label:"nav.commerce",icon:"▦",children:[{id:"products",label:"nav.products",icon:"·",routeName:"products"},{id:"inventory",label:"nav.inventory",icon:"·",routeName:"inventory"},{id:"orders",label:"nav.orders",icon:"·",routeName:"orders"},{id:"afterSales",label:"nav.afterSales",icon:"·",routeName:"afterSales"},{id:"reports",label:"nav.reports",icon:"·",routeName:"reports"}]}
];
export function navigationForRoles(roles:UserRole[]){
 const isPlatformReviewer=roles.some(role=>role==="PLATFORM_ADMIN"||role==="PLATFORM_OPERATOR");
 const isMerchant=roles.some(role=>role==="MERCHANT_OWNER"||role==="MERCHANT_STAFF");
 const allowed=(node:NavigationNode):boolean=>{
  if(node.id==="onboarding"&&isMerchant&&!isPlatformReviewer)return false;
  return !node.roles||node.roles.some(role=>roles.includes(role));
 };
 return navigationTree.filter(allowed).map(node=>({...node,children:node.children?.filter(allowed)})).filter(node=>node.routeName||node.children?.length);
}
