<script setup lang="ts">
import AdminLogin from "./components/AdminLogin.vue";
defineEmits<{ authenticated: [token: string] }>();
</script>
<template><AdminLogin @authenticated="$emit('authenticated', $event)" /></template>
