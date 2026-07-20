<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";

type UiToastTone = "info" | "success" | "warning" | "error";

const props = withDefaults(defineProps<{ message?: string; tone?: UiToastTone; duration?: number }>(), {
  message: "",
  tone: "info",
  duration: 4000
});
const emit = defineEmits<{ close: [] }>();
let timer: ReturnType<typeof setTimeout> | undefined;

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = undefined;
}

function close() {
  clearTimer();
  emit("close");
}

watch(() => [props.message, props.duration] as const, ([message, duration]) => {
  clearTimer();
  if (message && duration > 0) timer = setTimeout(close, duration);
}, { immediate: true });

onBeforeUnmount(clearTimer);
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="message" class="toast" :class="`is-${tone}`" :role="tone === 'error' ? 'alert' : 'status'" :aria-live="tone === 'error' ? 'assertive' : 'polite'">
        <span class="mark" aria-hidden="true" />
        <p>{{ message }}</p>
        <button type="button" aria-label="Close notification" title="Close" @click="close">&times;</button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast{position:fixed;z-index:3000;top:max(16px,env(safe-area-inset-top));left:50%;display:grid;width:min(440px,calc(100vw - 32px));min-height:44px;grid-template-columns:8px minmax(0,1fr) 30px;align-items:center;gap:10px;padding:8px 8px 8px 13px;border:1px solid var(--border,#dce1eb);border-radius:8px;background:var(--surface,#fff);box-shadow:0 14px 36px rgb(22 27 45 / 18%);color:var(--text,#202436);transform:translateX(-50%)}
.mark{width:7px;height:7px;border-radius:50%;background:var(--accent,#4255d4)}
p{min-width:0;margin:0;overflow-wrap:anywhere;font-size:12px;font-weight:600;line-height:1.45}
button{display:grid;width:30px;height:30px;place-items:center;padding:0;border:0;border-radius:6px;background:transparent;color:var(--text-muted,#7e8798);font:inherit;font-size:20px;line-height:1;cursor:pointer}
button:hover{background:var(--surface-raised,#f5f7fb);color:var(--text,#202436)}
button:focus-visible{outline:2px solid var(--accent,#4255d4);outline-offset:1px}
.is-success{border-color:color-mix(in srgb,var(--success,#158269) 32%,var(--border,#dce1eb))}.is-success .mark{background:var(--success,#158269)}
.is-warning{border-color:color-mix(in srgb,var(--warning,#ad7419) 35%,var(--border,#dce1eb))}.is-warning .mark{background:var(--warning,#ad7419)}
.is-error{border-color:color-mix(in srgb,var(--danger,#c13f5c) 32%,var(--border,#dce1eb))}.is-error .mark{background:var(--danger,#c13f5c)}
.toast-enter-active,.toast-leave-active{transition:opacity .18s ease,transform .18s ease}.toast-enter-from,.toast-leave-to{opacity:0;transform:translate(-50%,-10px)}
@media(max-width:480px){.toast{top:max(10px,env(safe-area-inset-top));width:calc(100vw - 20px)}}
@media(prefers-reduced-motion:reduce){.toast-enter-active,.toast-leave-active{transition:none}}
</style>
