<script setup lang="ts">
defineProps<{ activePage: string }>();
defineEmits<{ select: [page: string] }>();
const items = [{id:"onboarding",icon:"商",label:"商家入驻"},{id:"orders",icon:"单",label:"订单"},{id:"inventory",icon:"库",label:"库存"},{id:"members",icon:"员",label:"成员"},{id:"reports",icon:"表",label:"报表"}];
</script>
<template><aside class="left-side"><button v-for="item in items" :key="item.id" :class="{active:activePage===item.id}" :aria-label="item.label" @click="$emit('select',item.id)">{{item.icon}}</button><button :class="{active:activePage==='settings'}" aria-label="设置" @click="$emit('select','settings')">设</button></aside></template>
<style scoped>.left-side{display:flex;width:6rem;height:100%;flex-direction:column;flex-shrink:0;align-items:center;overflow:auto;padding:24px 0;color:var(--text-muted)}.left-side button{width:38px;height:38px;border:0;border-radius:8px;background:transparent;color:inherit;font-size:15px;cursor:pointer}.left-side button+button{margin-top:16px}.left-side button:last-child{margin-top:auto}.left-side button.active,.left-side button:hover{background:var(--surface-raised);color:var(--accent)}@media(max-width:850px){.left-side{width:3.8rem}}</style>
