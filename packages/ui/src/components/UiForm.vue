<script setup lang="ts">
import { provide, readonly, ref } from "vue";
import { getFormValue, UI_FORM_CONTEXT, type UiFormRules, type UiFormValidateOn, validateFormRule } from "../form";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{ model: unknown; rules?: UiFormRules; validateOn?: UiFormValidateOn }>(), { rules: () => ({}), validateOn: "submit" });
const emit = defineEmits<{ submit: []; invalid: [errors: Record<string, string>] }>();
const errors = ref<Record<string, string>>({});

async function validateField(name: string): Promise<boolean> {
  const rules = props.rules[name] ? (Array.isArray(props.rules[name]) ? props.rules[name] : [props.rules[name]]) : [];
  let message: string | undefined;
  for (const rule of rules) {
    message = await validateFormRule(rule, getFormValue(props.model, name), props.model);
    if (message) break;
  }
  const next = { ...errors.value };
  if (message) next[name] = message; else delete next[name];
  errors.value = next;
  return !message;
}

async function validate(): Promise<boolean> {
  const names = Object.keys(props.rules);
  const results = await Promise.all(names.map((name) => validateField(name)));
  return results.every(Boolean);
}

function resetValidation() { errors.value = {}; }
async function handleSubmit(event: Event) {
  event.preventDefault();
  if (await validate()) emit("submit"); else emit("invalid", { ...errors.value });
}

provide(UI_FORM_CONTEXT, { errors: readonly(errors), validateField, validate, validateOn: props.validateOn });
defineExpose({ errors: readonly(errors), validate, validateField, resetValidation });
</script>

<template>
  <form v-bind="$attrs" @submit="handleSubmit"><slot :errors="errors" :validate="validate" /></form>
</template>
