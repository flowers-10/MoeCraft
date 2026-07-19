<script setup lang="ts">
import type { AdminButtonPermission, UserRole } from "@moecraft/shared";
import StoreManagement from "../components/StoreManagement.vue";
defineProps<{ roles: UserRole[]; buttonPermissions: AdminButtonPermission[] }>();
</script>
<template><StoreManagement :roles="roles" :button-permissions="buttonPermissions" section="store" /></template>

