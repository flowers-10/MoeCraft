<script setup lang="ts">withDefaults(defineProps<{asideWidth?:string;gap?:string}>(),{asideWidth:"360px",gap:"20px"});</script>
<template><div class="split" :style="{'--aside-width':asideWidth,'--gap':gap}"><section><slot/></section><aside><slot name="aside"/></aside></div></template>
<style scoped>.split{display:grid;grid-template-columns:minmax(0,1fr) var(--aside-width);gap:var(--gap)}section,aside{min-width:0}@media(max-width:900px){.split{grid-template-columns:1fr}}</style>
