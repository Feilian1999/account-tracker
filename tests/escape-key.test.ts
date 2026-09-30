import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { closeTopOverlay, useEscapeKey } from "../src/composables/useEscapeKey";

const pressEscape = () =>
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

describe("useEscapeKey", () => {
  it("closes the most recently opened layer, even if its parent registered later", async () => {
    // Books.vue shape: a page-level layer (the detail view) whose child sheet
    // registers FIRST, because children mount before their parent.
    const sheetOpen = ref(false);
    const detailOpen = ref(true);
    const closeSheet = vi.fn(() => (sheetOpen.value = false));
    const closeDetail = vi.fn(() => (detailOpen.value = false));

    const Sheet = defineComponent({
      setup() {
        useEscapeKey(sheetOpen, closeSheet);
        return () => null;
      },
    });
    const Page = defineComponent({
      setup() {
        useEscapeKey(detailOpen, closeDetail);
        return () => h(Sheet);
      },
    });
    const wrapper = mount(Page);

    sheetOpen.value = true; // opened on top of the detail view
    await nextTick();

    pressEscape();
    expect(closeSheet).toHaveBeenCalledOnce();
    expect(closeDetail).not.toHaveBeenCalled();

    await nextTick();
    pressEscape();
    expect(closeDetail).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it("reports whether anything was open", async () => {
    const open = ref(false);
    const close = vi.fn(() => (open.value = false));
    const wrapper = mount(
      defineComponent({
        setup() {
          useEscapeKey(open, close);
          return () => null;
        },
      }),
    );
    expect(closeTopOverlay()).toBe(false);
    open.value = true;
    await nextTick();
    expect(closeTopOverlay()).toBe(true);
    expect(close).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("treats a layer that is already open when mounted as the newest", async () => {
    const older = ref(false);
    const closeOlder = vi.fn();
    const closeNewer = vi.fn();
    const first = mount(
      defineComponent({
        setup() {
          useEscapeKey(older, closeOlder);
          return () => null;
        },
      }),
    );
    older.value = true;
    await nextTick();
    const second = mount(
      defineComponent({
        setup() {
          useEscapeKey(ref(true), closeNewer); // e.g. a v-if'd modal
          return () => null;
        },
      }),
    );
    pressEscape();
    expect(closeNewer).toHaveBeenCalledOnce();
    expect(closeOlder).not.toHaveBeenCalled();
    first.unmount();
    second.unmount();
  });
});
