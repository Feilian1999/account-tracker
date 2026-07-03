import { onMounted, onUnmounted, Ref } from "vue";

/**
 * Escape-to-close for dialogs/modals.
 *
 * All dialogs share a single window listener and a stack, so one Escape press
 * closes only the TOP-MOST active dialog instead of every stacked overlay at once.
 */
type Entry = { isActive: Ref<boolean>; onEscape: () => void };

const stack: Entry[] = [];
let listening = false;

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].isActive.value) {
      stack[i].onEscape();
      break;
    }
  }
}

export function useEscapeKey(isActive: Ref<boolean>, onEscape: () => void) {
  const entry: Entry = { isActive, onEscape };

  onMounted(() => {
    stack.push(entry);
    if (!listening) {
      window.addEventListener("keydown", handleKeyDown);
      listening = true;
    }
  });

  onUnmounted(() => {
    const idx = stack.indexOf(entry);
    if (idx >= 0) stack.splice(idx, 1);
    if (stack.length === 0 && listening) {
      window.removeEventListener("keydown", handleKeyDown);
      listening = false;
    }
  });
}
