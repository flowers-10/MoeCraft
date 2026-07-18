<script setup lang="ts">
import type { UserRole } from "@moecraft/shared";
import MerchantOnboarding from "./components/MerchantOnboarding.vue";
defineProps<{ roles: UserRole[] }>();
</script>
<template><MerchantOnboarding :roles="roles" /></template>
