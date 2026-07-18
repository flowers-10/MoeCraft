<script setup lang="ts">
import type { UserRole } from "@moecraft/shared";
import StoreManagement from "../components/StoreManagement.vue";
defineProps<{ roles: UserRole[] }>();
</script>
<template><StoreManagement :roles="roles" section="store" /></template>

