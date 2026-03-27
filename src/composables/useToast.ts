import { ref } from "vue";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration: number;
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

/**
 * Show a toast notification at the bottom of the screen.
 * Auto-dismisses after `duration` ms.
 */
export function useToast() {
  const show = (message: string, type: Toast["type"] = "info", duration = 3000) => {
    const id = nextId++;
    toasts.value.push({ id, message, type, duration });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, duration);
  };

  const success = (message: string, duration?: number) => show(message, "success", duration);
  const error = (message: string, duration?: number) => show(message, "error", duration);
  const info = (message: string, duration?: number) => show(message, "info", duration);
  const warning = (message: string, duration?: number) => show(message, "warning", duration);

  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  return { toasts, show, success, error, info, warning, dismiss };
}
