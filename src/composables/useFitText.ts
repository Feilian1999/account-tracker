import { nextTick, onBeforeUnmount, watch, type Ref } from "vue";

/**
 * Shrinks an element's font size (from `max` down to `min` px) until its text
 * fits on one line, re-fitting when the text or the available width changes.
 * Only if it still overflows at `min` does it wrap — a total is never cut off.
 */
export function useFitText(
  el: Ref<HTMLElement | undefined>,
  text: () => string,
  { max = 24, min = 14 }: { max?: number; min?: number } = {},
) {
  const fit = () => {
    const node = el.value;
    if (!node) return;
    node.style.whiteSpace = "nowrap";
    let size = max;
    node.style.fontSize = `${size}px`;
    while (node.scrollWidth > node.clientWidth && size > min) {
      size -= 1;
      node.style.fontSize = `${size}px`;
    }
    if (node.scrollWidth > node.clientWidth) node.style.whiteSpace = "normal";
  };

  // Bound to whatever element the ref holds — it may appear later (v-if) or
  // be replaced. Only a WIDTH change refits: fitting changes the font size,
  // hence the parent's height, and reacting to that would loop.
  let observer: ResizeObserver | undefined;
  let lastWidth = -1;
  watch(
    el,
    (node) => {
      observer?.disconnect();
      observer = undefined;
      lastWidth = -1;
      if (!node) return;
      fit();
      const parent = node.parentElement;
      if (typeof ResizeObserver === "undefined" || !parent) return;
      observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        if (width === lastWidth) return;
        lastWidth = width;
        fit();
      });
      observer.observe(parent);
    },
    { immediate: true, flush: "post" },
  );
  onBeforeUnmount(() => observer?.disconnect());
  watch(text, () => nextTick(fit));
}
