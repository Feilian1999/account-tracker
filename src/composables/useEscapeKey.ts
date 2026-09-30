import { onMounted, onUnmounted, watch, type Ref } from "vue";

/**
 * Escape-to-close for dialogs/modals (and in-page layers such as Books' detail
 * view or Home's menus).
 *
 * All registrations share a single window listener, and one Escape press closes
 * only the MOST RECENTLY OPENED active one. Ordering is by activation time, not
 * by registration: a parent registers after its children (parents mount last),
 * so registration order would let Books.vue's "back to list" win over a sheet
 * opened on top of it.
 *
 * The same stack backs the browser/OS back button (see closeTopOverlay and the
 * router guard).
 */
type Entry = {
  isActive: Ref<boolean>;
  onEscape: () => void;
  activatedAt: number;
};

const stack: Entry[] = [];
let listening = false;
let clock = 0;

function topActive(): Entry | undefined {
  let top: Entry | undefined;
  for (const entry of stack) {
    if (entry.isActive.value && (!top || entry.activatedAt > top.activatedAt)) {
      top = entry;
    }
  }
  return top;
}

/** Closes the most recently opened active layer. Returns false if none is open. */
export function closeTopOverlay(): boolean {
  const top = topActive();
  if (!top) return false;
  top.onEscape();
  return true;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  closeTopOverlay();
}

export function useEscapeKey(isActive: Ref<boolean>, onEscape: () => void) {
  const entry: Entry = { isActive, onEscape, activatedAt: 0 };

  watch(isActive, (active) => {
    if (active) entry.activatedAt = ++clock;
  });

  onMounted(() => {
    // Already open when mounted (e.g. a v-if'd modal) → it is the newest layer.
    if (isActive.value) entry.activatedAt = ++clock;
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
