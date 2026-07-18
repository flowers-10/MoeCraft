<script setup lang="ts">
import { useRoute } from "vue-router";
import type { MessageKey } from "../../i18n";
import { useLocale } from "../../i18n";

const route = useRoute();
const { t } = useLocale();
const keys: Record<string, MessageKey> = { overview:"nav.overview", products:"nav.products", inventory:"nav.inventory", afterSales:"nav.afterSales", reports:"nav.reports" };
</script>

<template>
  <section class="placeholder content-scroll"><div class="placeholder-card"><span>◇</span><small>MOECRAFT CONSOLE</small><h1>{{ t(keys[String(route.name)] ?? 'nav.overview') }}</h1><p>{{ t('common.comingSoonHint') }}</p><b>{{ t('common.comingSoon') }}</b></div></section>
</template>
