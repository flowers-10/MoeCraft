<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(defineProps<{
  accept?: string;
  currentName?: string;
  placeholder?: string;
  hint?: string;
  busy?: boolean;
  disabled?: boolean;
  error?: string;
  browseLabel?: string;
  dropHint?: string;
  uploadingLabel?: string;
  uploadingHint?: string;
  clearLabel?: string;
}>(), { accept: "", placeholder: "Choose a file", hint: "", busy: false, disabled: false, error: "", browseLabel: "Browse", dropHint: "Drop a file here or click to browse", uploadingLabel: "Uploading…", uploadingHint: "Preparing the file metadata", clearLabel: "Clear selected file" });
const emit = defineEmits<{ select: [file: File]; clear: [] }>();
const input = ref<HTMLInputElement | null>(null);
const selectedName = ref("");

function openPicker() { if (!props.disabled && !props.busy) input.value?.click(); }
function selectFile(file?: File) { if (!file || props.disabled || props.busy) return; selectedName.value = file.name; emit("select", file); }
function onInput(event: Event) { selectFile((event.target as HTMLInputElement).files?.[0]); }
function onDrop(event: DragEvent) { selectFile(event.dataTransfer?.files?.[0]); }
function clearFile() { selectedName.value = ""; if (input.value) input.value.value = ""; emit("clear"); }
</script>

<template>
  <div class="upload" :class="{ 'is-disabled': disabled, 'is-busy': busy, 'has-file': selectedName || currentName, 'has-error': error }">
    <input ref="input" class="native-input" type="file" :accept="accept" :disabled="disabled || busy" @change="onInput">
    <button class="dropzone" type="button" :disabled="disabled || busy" @click="openPicker" @dragover.prevent @drop.prevent="onDrop">
      <span class="upload-icon" aria-hidden="true">↑</span>
      <span class="upload-copy">
        <strong>{{ busy ? uploadingLabel : selectedName || currentName || placeholder }}</strong>
        <small v-if="!busy">{{ dropHint }}</small>
        <small v-else>{{ uploadingHint }}</small>
      </span>
      <span class="browse">{{ browseLabel }}</span>
    </button>
    <button v-if="selectedName || currentName" class="clear" type="button" :disabled="disabled || busy" :aria-label="clearLabel" @click="clearFile">×</button>
    <small v-if="error" class="error">{{ error }}</small>
    <small v-else-if="hint" class="hint">{{ hint }}</small>
  </div>
</template>

<style scoped>
.upload { display: grid; gap: 7px; position: relative; }
.native-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.dropzone { display: flex; align-items: center; gap: 11px; width: 100%; min-height: 68px; padding: 12px 13px; border: 1px dashed var(--border, #cbd3e2); border-radius: 10px; background: var(--surface-raised, #f5f7fb); color: var(--text, #202436); text-align: left; cursor: pointer; transition: border-color .18s, background .18s, box-shadow .18s; }
.dropzone:hover:not(:disabled), .dropzone:focus-visible { border-color: var(--accent, #4255d4); background: color-mix(in srgb, var(--accent-soft, #e3e7ff) 48%, var(--surface, #fff)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #4255d4) 12%, transparent); outline: 0; }
.dropzone:disabled { cursor: not-allowed; opacity: .65; }
.upload-icon { display: grid; flex: 0 0 auto; width: 32px; height: 32px; place-items: center; border-radius: 9px; background: var(--accent-soft, #e3e7ff); color: var(--accent, #4255d4); font-size: 19px; font-weight: 700; }
.upload-copy { display: grid; min-width: 0; gap: 3px; }
.upload-copy strong { overflow: hidden; color: var(--text, #202436); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.upload-copy small, .hint { color: var(--text-muted, #7e8798); font-size: 10px; }
.browse { margin-left: auto; padding: 6px 9px; border: 1px solid var(--border, #dce1eb); border-radius: 7px; background: var(--surface, #fff); color: var(--text-secondary, #596174); font-size: 10px; font-weight: 650; white-space: nowrap; }
.clear { position: absolute; top: 8px; right: 8px; display: grid; width: 22px; height: 22px; place-items: center; border: 0; border-radius: 6px; background: var(--danger-soft, #f9e1e8); color: var(--danger, #c13f5c); font-size: 16px; line-height: 1; cursor: pointer; }
.clear:hover:not(:disabled), .clear:focus-visible { background: var(--danger, #c13f5c); color: #fff; outline: 0; }
.error { color: var(--danger, #c13f5c); font-size: 10px; }
.has-error .dropzone { border-color: var(--danger, #c13f5c); }
</style>
