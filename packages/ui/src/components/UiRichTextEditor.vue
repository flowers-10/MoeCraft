<script setup lang="ts">
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { onBeforeUnmount, ref, watch } from "vue";

export type UiRichTextImage = { src: string; fileId: string; alt?: string };
const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  uploadImage?: (file: File) => Promise<UiRichTextImage>;
  resolveImage?: (fileId: string) => Promise<string>;
  imageLabel?: string;
}>(), { modelValue: "", placeholder: "Write content…", disabled: false, invalid: false, imageLabel: "Insert image" });
const emit = defineEmits<{ "update:modelValue": [value: string]; uploadError: [error: unknown] }>();
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const resolvedUrls = new Set<string>();
let hydratingImages = false;

const ProductImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-file-id"),
        renderHTML: (attributes: Record<string, unknown>) => typeof attributes.fileId === "string" ? { "data-file-id": attributes.fileId } : {}
      }
    };
  }
});

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), ProductImage.configure({ allowBase64: false })],
  editorProps: { attributes: { class: "mc-rich-content", role: "textbox", "aria-multiline": "true", "aria-label": props.placeholder } },
  onCreate: () => { void hydrateImages(); },
  onUpdate: ({ editor: current }) => { if (!hydratingImages) emit("update:modelValue", current.isEmpty ? "" : current.getHTML()); }
});

watch(() => props.modelValue, (value) => {
  if (!editor.value || value === editor.value.getHTML() || (!value && editor.value.isEmpty)) return;
  editor.value.commands.setContent(value || "", { emitUpdate: false });
  void hydrateImages();
});
watch(() => props.disabled, (disabled) => editor.value?.setEditable(!disabled));

async function selectImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !props.uploadImage || !editor.value) return;
  uploading.value = true;
  try {
    const image = await props.uploadImage(file);
    if (image.src.startsWith("blob:")) resolvedUrls.add(image.src);
    editor.value.chain().focus().setImage({ src: image.src, alt: image.alt || file.name }).updateAttributes("image", { fileId: image.fileId }).run();
  } catch (error) {
    emit("uploadError", error);
  } finally {
    uploading.value = false;
  }
}

async function hydrateImages() {
  if (!props.resolveImage || !editor.value) return;
  const targets: Array<{ pos: number; fileId: string }> = [];
  editor.value.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && typeof node.attrs.fileId === "string") targets.push({ pos, fileId: node.attrs.fileId });
  });
  hydratingImages = true;
  try {
    for (const target of targets) {
      const src = await props.resolveImage(target.fileId);
      if (src.startsWith("blob:")) resolvedUrls.add(src);
      editor.value?.chain().setNodeSelection(target.pos).updateAttributes("image", { src }).run();
    }
  } finally {
    hydratingImages = false;
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy();
  resolvedUrls.forEach((url) => URL.revokeObjectURL(url));
  resolvedUrls.clear();
});
</script>

<template>
  <div class="mc-rich-editor" :class="{ invalid, disabled }">
    <div v-if="editor" class="toolbar" role="toolbar" aria-label="Rich text formatting">
      <button type="button" :class="{ active:editor.isActive('bold') }" :disabled="disabled" aria-label="Bold (Ctrl+B)" @click="editor.chain().focus().toggleBold().run()"><b>B</b></button>
      <button type="button" :class="{ active:editor.isActive('italic') }" :disabled="disabled" aria-label="Italic (Ctrl+I)" @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button type="button" :class="{ active:editor.isActive('underline') }" :disabled="disabled" aria-label="Underline (Ctrl+U)" @click="editor.chain().focus().toggleUnderline().run()"><u>U</u></button>
      <button type="button" :class="{ active:editor.isActive('heading',{level:2}) }" :disabled="disabled" aria-label="Heading 2" @click="editor.chain().focus().toggleHeading({level:2}).run()">H2</button>
      <button type="button" :class="{ active:editor.isActive('bulletList') }" :disabled="disabled" aria-label="Bullet list" @click="editor.chain().focus().toggleBulletList().run()">• List</button>
      <button type="button" :class="{ active:editor.isActive('orderedList') }" :disabled="disabled" aria-label="Ordered list" @click="editor.chain().focus().toggleOrderedList().run()">1. List</button>
      <button v-if="uploadImage" type="button" :disabled="disabled||uploading" :aria-label="imageLabel" @click="fileInput?.click()">{{ uploading ? '…' : '▧' }}</button>
      <span class="spacer" />
      <button type="button" :disabled="disabled||!editor.can().undo()" aria-label="Undo (Ctrl+Z)" @click="editor.chain().focus().undo().run()">↶</button>
      <button type="button" :disabled="disabled||!editor.can().redo()" aria-label="Redo (Ctrl+Shift+Z)" @click="editor.chain().focus().redo().run()">↷</button>
      <input v-if="uploadImage" ref="fileInput" class="file-input" type="file" accept="image/jpeg,image/png,image/webp" tabindex="-1" @change="selectImage">
    </div>
    <EditorContent :editor="editor" />
    <span v-if="editor?.isEmpty" class="placeholder" aria-hidden="true">{{ placeholder }}</span>
  </div>
</template>

<style scoped>
.mc-rich-editor{position:relative;overflow:hidden;border:1px solid var(--border,#dce1eb);border-radius:8px;background:var(--surface-raised,#f5f7fb);color:var(--text,#202436)}.mc-rich-editor:focus-within{border-color:var(--accent,#4255d4);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#4255d4) 16%,transparent)}.mc-rich-editor.invalid{border-color:var(--danger,#c13f5c)}.mc-rich-editor.disabled{opacity:.65}.toolbar{display:flex;align-items:center;gap:4px;padding:7px;border-bottom:1px solid var(--border,#dce1eb);background:var(--surface,#fff)}.toolbar button{min-width:30px;height:30px;padding:0 7px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--text-secondary,#596174);font:inherit;font-size:11px;cursor:pointer}.toolbar button:hover:not(:disabled),.toolbar button:focus-visible,.toolbar button.active{border-color:var(--border,#dce1eb);background:var(--accent-soft,#e3e7ff);color:var(--accent,#4255d4);outline:0}.toolbar button:disabled{opacity:.4;cursor:not-allowed}.spacer{flex:1}.file-input{position:absolute;width:1px;height:1px;clip-path:inset(50%)}.placeholder{position:absolute;top:58px;left:13px;color:var(--text-muted,#7e8798);font-size:12px;pointer-events:none}:deep(.mc-rich-content){min-height:180px;padding:12px;outline:0;line-height:1.7}:deep(.mc-rich-content p:first-child){margin-top:0}:deep(.mc-rich-content img){display:block;max-width:100%;height:auto;margin:14px auto;border-radius:8px}:deep(.mc-rich-content pre){overflow:auto;padding:10px;border-radius:6px;background:#1f2430;color:#fff}:deep(.mc-rich-content blockquote){padding-left:12px;border-left:3px solid var(--accent,#4255d4);color:var(--text-secondary,#596174)}
</style>
