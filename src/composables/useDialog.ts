import { computed, ref } from "vue";

/**
 * The app's own confirm / prompt dialogs, replacing the browser's `confirm()`
 * and `prompt()`. Callable from components and stores alike; one `AppDialog`
 * (mounted in App.vue) shows them, one at a time in request order.
 */
export interface DialogOptions {
  title?: string;
  message: string;
  /** Confirm button label; defaults to "OK" (or "Delete" when `danger`). */
  confirmText?: string;
  cancelText?: string;
  /** A destructive action: red confirm button, focus starts on Cancel. */
  danger?: boolean;
}

export interface PromptOptions extends DialogOptions {
  defaultValue?: string;
  placeholder?: string;
  /** Show the value only for copying: no Cancel, the field is read-only. */
  readOnly?: boolean;
}

export type DialogRequest =
  | ({ kind: "confirm" } & DialogOptions)
  | ({ kind: "prompt" } & PromptOptions);

interface Pending {
  id: number;
  request: DialogRequest;
  resolve: (value: boolean | string | null) => void;
}

const queue = ref<Pending[]>([]);
let nextId = 0;

/** The dialog on screen, if any. */
export const currentDialog = computed(() => queue.value[0]);

function open(request: DialogRequest) {
  return new Promise<boolean | string | null>((resolve) => {
    queue.value.push({ id: nextId++, request, resolve });
  });
}

/** Resolves true when confirmed, false when cancelled or dismissed. */
export function confirmDialog(options: DialogOptions): Promise<boolean> {
  return open({ kind: "confirm", ...options }) as Promise<boolean>;
}

/** Resolves the entered text, or null when cancelled or dismissed. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  return open({ kind: "prompt", ...options }) as Promise<string | null>;
}

/** Closes the current dialog with its answer (AppDialog only). */
export function settleDialog(value: boolean | string | null) {
  const current = queue.value.shift();
  current?.resolve(value);
}
