import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  runPrimaryAction,
  usePrimaryAction,
} from "../src/composables/usePrimaryAction";

describe("usePrimaryAction", () => {
  it("runs an active form action before its page action", async () => {
    const runPage = vi.fn();
    const runForm = vi.fn();
    const formActive = ref(false);
    const wrapper = mount(
      defineComponent({
        setup() {
          usePrimaryAction(ref(true), runPage);
          usePrimaryAction(formActive, runForm, 1);
          return () => null;
        },
      }),
    );

    expect(runPrimaryAction()).toBe(true);
    expect(runPage).toHaveBeenCalledOnce();

    formActive.value = true;
    expect(runPrimaryAction()).toBe(true);
    expect(runForm).toHaveBeenCalledOnce();

    formActive.value = false;
    expect(runPrimaryAction(1)).toBe(false);
    expect(runPage).toHaveBeenCalledOnce();

    wrapper.unmount();
    expect(runPrimaryAction()).toBe(false);
  });
});
