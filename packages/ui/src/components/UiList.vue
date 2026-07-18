<script setup lang="ts" generic="T">defineProps<{items:T[];keyBy?:(item:T,index:number)=>string|number}>();</script>
<template><div class="list" role="list"><div v-for="(item,index) in items" :key="keyBy?.(item,index)??index" class="item" role="listitem"><slot :item="item" :index="index"/></div></div></template>
<style scoped>.list{display:grid}.item{padding:13px 0;border-bottom:1px solid var(--border,#dce1eb)}.item:last-child{border-bottom:0}</style>
