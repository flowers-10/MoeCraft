<script setup lang="ts">
import OrderBoard from "./components/OrderBoard.vue";
import { UiPageContainer, UiPageHeader } from "@moecraft/ui";
import { useLocale } from "../../../i18n";
const { t } = useLocale();
</script>
<template><UiPageContainer size="full" class="dashboard"><UiPageHeader eyebrow="ORDER MANAGEMENT" :title="t('nav.orders')" :description="t('common.comingSoonHint')"/><OrderBoard /></UiPageContainer></template>
