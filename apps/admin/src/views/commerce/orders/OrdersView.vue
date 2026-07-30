<script setup lang="ts">
import OrderBoard from "./components/OrderBoard.vue";
import { UiPageContainer, UiPageHeader } from "@moecraft/ui";
import { useLocale } from "../../../i18n";
import type { AdminButtonPermission } from "@moecraft/shared";
withDefaults(defineProps<{buttonPermissions?:AdminButtonPermission[]}>(),{buttonPermissions:()=>[]});
const { t } = useLocale();
</script>
<template><UiPageContainer size="full" class="dashboard content-scroll"><UiPageHeader eyebrow="ORDER MANAGEMENT" :title="t('nav.orders')" description="商家订单履约与平台跨店监察；支付事实只读。"/><OrderBoard :button-permissions="buttonPermissions"/></UiPageContainer></template>
