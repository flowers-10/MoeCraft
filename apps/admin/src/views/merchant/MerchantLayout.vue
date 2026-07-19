<script setup lang="ts">
import type { AdminButtonPermission, UserRole } from "@moecraft/shared";
import { RouterView } from "vue-router";
withDefaults(defineProps<{ roles?: UserRole[]; buttonPermissions?: AdminButtonPermission[] }>(), {
  roles: () => [],
  buttonPermissions: () => []
});
</script>
<template><RouterView v-slot="{ Component }"><component :is="Component" :roles="roles" :button-permissions="buttonPermissions" /></RouterView></template>
