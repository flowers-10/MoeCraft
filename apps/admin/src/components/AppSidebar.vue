<script setup lang="ts">
defineProps<{ activePage: string }>();
defineEmits<{ select: [page: string] }>();
const items = [{ id:"orders", icon:"▦", label:"订单" },{ id:"inventory", icon:"◇", label:"库存" },{ id:"members", icon:"⌂", label:"会员" },{ id:"reports", icon:"▥", label:"报表" }];
</script>
<template><aside class="left-side"><button v-for="item in items" :key="item.id" :class="{active:activePage===item.id}" :aria-label="item.label" @click="$emit('select',item.id)">{{ item.icon }}</button><button :class="{active:activePage==='settings'}" aria-label="设置" @click="$emit('select','settings')">⚙</button><button aria-label="退出">⇥</button></aside></template>
<style scoped>
.left-side{display:flex;width:6rem;height:100%;flex-direction:column;flex-shrink:0;align-items:center;overflow:hidden;padding:24px 0;color:var(--text-muted);animation:left 1s both}.left-side button{width:34px;height:34px;border:0;background:transparent;color:inherit;font-size:24px;line-height:1;cursor:pointer}.left-side button+button{margin-top:24px}.left-side button:nth-last-child(2){margin-top:auto}.left-side button.active,.left-side button:hover{color:var(--accent)}@keyframes left{from{transform:translateX(-30px);opacity:0}to{transform:none;opacity:1}}@media(max-width:850px){.left-side{display:none}}
</style>
