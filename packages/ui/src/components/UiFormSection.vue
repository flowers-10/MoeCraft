<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <section class="form-section">
    <header class="section-header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="section-actions"><slot name="actions" /></div>
    </header>
    <div class="section-body"><slot /></div>
  </section>
</template>

<style scoped>
.form-section {
  border: 1px solid var(--border, #dce1eb);
  border-radius: 14px;
  background: var(--surface, #fff);
  box-shadow: 0 8px 24px rgb(31 45 74 / 5%);
}
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 15px;
  border-bottom: 1px solid var(--border, #dce1eb);
}
.section-header h3 { margin: 0; color: var(--text, #202436); font-size: 15px; line-height: 1.3; }
.section-header p { margin: 5px 0 0; color: var(--text-muted, #7e8798); font-size: 11px; line-height: 1.45; }
.section-actions { flex: 0 0 auto; }
.section-body { padding: 20px; }
@media (max-width: 600px) {
  .section-header { flex-direction: column; }
  .section-actions { width: 100%; }
  .section-actions :deep(button) { width: 100%; }
}
</style>
