<script setup lang="ts">
import UiButton from "./UiButton.vue";
import UiInput from "./UiInput.vue";

const props = withDefaults(defineProps<{ modelValue?: string; placeholder?: string; searchLabel?: string; clearOnEscape?: boolean; disabled?: boolean }>(), {
  modelValue: "", placeholder: "Search", searchLabel: "Search", clearOnEscape: true, disabled: false
});
const emit = defineEmits<{ "update:modelValue": [value: string]; search: [value: string]; clear: [] }>();

function submit() { if (!props.disabled) emit("search", props.modelValue); }
function onEscape() {
  if (!props.clearOnEscape || props.disabled || !props.modelValue) return;
  emit("update:modelValue", "");
  emit("clear");
}
</script>

<template>
  <form class="mc-search" role="search" @submit.prevent="submit">
    <UiInput :model-value="modelValue" type="search" :placeholder="placeholder" :disabled="disabled" @update:model-value="$emit('update:modelValue',$event)" @keydown.esc="onEscape" />
    <UiButton type="submit" variant="secondary" :disabled="disabled">{{ searchLabel }}</UiButton>
  </form>
</template>

<style scoped>
.mc-search{display:flex;align-items:stretch;gap:8px}.mc-search :deep(input){min-width:0}.mc-search :deep(button){flex:0 0 auto}
@media(max-width:480px){.mc-search{align-items:stretch}.mc-search :deep(button){padding-inline:12px}}
</style>
