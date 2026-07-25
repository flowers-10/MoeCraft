import { onBeforeUnmount, reactive } from "vue";
import { downloadFileBlob } from "../api";

export type FilePreviewKey = object | string;

export function useFilePreview() {
  const urls = reactive(new Map<FilePreviewKey, string>());
  const errors = reactive(new Map<FilePreviewKey, boolean>());
  const requests = new Map<FilePreviewKey, { controller: AbortController; generation: number }>();
  const generations = new Map<FilePreviewKey, number>();

  function cancelRequest(key: FilePreviewKey) {
    requests.get(key)?.controller.abort();
    requests.delete(key);
  }

  function replaceUrl(key: FilePreviewKey, url: string) {
    const previous = urls.get(key);
    if (previous) URL.revokeObjectURL(previous);
    urls.set(key, url);
    errors.delete(key);
  }

  function showFile(key: FilePreviewKey, file: File) {
    cancelRequest(key);
    replaceUrl(key, URL.createObjectURL(file));
  }

  async function showFileId(key: FilePreviewKey, fileId: string) {
    cancelRequest(key);
    if (!fileId) {
      clearPreview(key);
      return;
    }

    const generation = (generations.get(key) ?? 0) + 1;
    generations.set(key, generation);
    const controller = new AbortController();
    requests.set(key, { controller, generation });
    errors.delete(key);

    try {
      const blob = await downloadFileBlob(fileId, controller.signal);
      if (requests.get(key)?.generation !== generation) return;
      replaceUrl(key, URL.createObjectURL(blob));
    } catch (error) {
      if (controller.signal.aborted) return;
      errors.set(key, true);
    } finally {
      if (requests.get(key)?.generation === generation) requests.delete(key);
    }
  }

  function clearPreview(key: FilePreviewKey) {
    cancelRequest(key);
    generations.set(key, (generations.get(key) ?? 0) + 1);
    const url = urls.get(key);
    if (url) URL.revokeObjectURL(url);
    urls.delete(key);
    errors.delete(key);
  }

  function dispose() {
    requests.forEach(({ controller }) => controller.abort());
    requests.clear();
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls.clear();
    errors.clear();
    generations.clear();
  }

  onBeforeUnmount(dispose);

  return {
    previewUrl: (key: FilePreviewKey) => urls.get(key) ?? "",
    previewFailed: (key: FilePreviewKey) => errors.get(key) ?? false,
    showFile,
    showFileId,
    clearPreview
  };
}
