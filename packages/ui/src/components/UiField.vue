<script setup lang="ts">
import { computed, inject } from "vue";
import { UI_FORM_CONTEXT } from "../form";

const props = defineProps<{ label: string; name?: string; hint?: string; error?: string; required?: boolean }>();
const form = inject(UI_FORM_CONTEXT, null);
const fieldError = computed(() => props.error || (props.name ? form?.errors.value[props.name] : ""));
function validateField() { if (!props.name || !form || form.validateOn === "submit") return; void form.validateField(props.name); }
</script>
<template><label class="field" @focusout="validateField" @input="validateField"><span class="label">{{label}}<i v-if="required">*</i></span><slot/><small v-if="fieldError" class="error">{{fieldError}}</small><small v-else-if="hint">{{hint}}</small></label></template>
<style scoped>.field{display:grid;gap:7px}.label{color:var(--text-secondary,#596174);font-size:11px;font-weight:500}.label i{margin-left:3px;color:var(--danger,#c13f5c);font-style:normal}small{color:var(--text-muted,#7e8798);font-size:10px}.error{color:var(--danger,#c13f5c)}</style>
