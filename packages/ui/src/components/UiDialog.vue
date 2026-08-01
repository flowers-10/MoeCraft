<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  modelValue: boolean;
  label: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  panelClass?: string;
  placement?: "center" | "right";
  width?: string;
}>(), { closeOnEscape: true, closeOnBackdrop: true, panelClass: "", placement: "center", width: "" });
const emit = defineEmits<{ "update:modelValue": [value: boolean]; close: [] }>();
const panel = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;

function close() {
  emit("update:modelValue", false);
  emit("close");
}

function onBackdrop(event: MouseEvent) {
  if (props.closeOnBackdrop && event.target === event.currentTarget) close();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.closeOnEscape) {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab" || !panel.value) return;
  const focusable = [...panel.value.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) { event.preventDefault(); panel.value.focus(); return; }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

watch(() => props.modelValue, async (open) => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener("keydown", onKeydown);
    await nextTick();
    panel.value?.querySelector<HTMLElement>("[autofocus],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]")?.focus();
  } else {
    document.removeEventListener("keydown", onKeydown);
    previousFocus?.focus();
    previousFocus = null;
  }
}, { immediate: true });

onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mc-dialog-backdrop" :class="`is-${placement}`" @mousedown="onBackdrop">
      <section ref="panel" class="mc-dialog-panel" :class="panelClass" :style="width ? { width } : undefined" role="dialog" aria-modal="true" :aria-label="label" tabindex="-1">
        <slot :close="close" />
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.mc-dialog-backdrop{position:fixed;z-index:100;inset:0;display:grid;place-items:center;padding:18px;background:rgb(5 8 13/.72)}
.mc-dialog-panel{width:min(720px,100%);max-height:calc(100dvh - 36px);overflow:auto;border:1px solid var(--border,#dce1eb);border-radius:12px;background:var(--surface,#fff);box-shadow:var(--shadow,0 20px 60px rgb(15 23 42/.2));outline:0}
.mc-dialog-backdrop.is-right{justify-items:end;padding:0}.is-right>.mc-dialog-panel{display:flex;width:min(720px,100vw);height:100dvh;max-height:100dvh;flex-direction:column;overflow:hidden;border-block:0;border-right:0;border-radius:0}
.mc-dialog-panel:focus-visible{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#4255d4) 18%,transparent),var(--shadow,0 20px 60px rgb(15 23 42/.2))}
</style>
