<script setup lang="ts">
import type { AdminButtonPermission, UserRole } from "@moecraft/shared";
import StoreManagement from "../components/StoreManagement.vue";
withDefaults(defineProps<{ roles?: UserRole[]; buttonPermissions?: AdminButtonPermission[] }>(), {
  roles: () => [],
  buttonPermissions: () => []
});
</script>
<template><StoreManagement :roles="roles" :button-permissions="buttonPermissions" section="team" /></template>
