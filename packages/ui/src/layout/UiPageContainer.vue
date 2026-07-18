<script setup lang="ts">withDefaults(defineProps<{size?:"md"|"lg"|"full"}>(),{size:"lg"});</script>
<template><div class="container" :class="`is-${size}`"><slot/></div></template>
<style scoped>.container{width:100%;padding:clamp(14px,2vw,28px);margin:0 auto;overflow:auto}.is-md{max-width:960px}.is-lg{max-width:1280px}.is-full{max-width:none}</style>
