import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import AppDialog from "../src/components/AppDialog.vue";
import {
  confirmDialog,
  currentDialog,
  promptDialog,
  settleDialog,
} from "../src/composables/useDialog";

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => ({ userProfile: { animations: false } }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mountDialog = () =>
  mount(AppDialog, {
    attachTo: document.body,
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { teleport: true },
    },
  });

const settled = () => new Promise((r) => setTimeout(r));

afterEach(() => {
  // Leave no dialog queued for the next test.
  while (currentDialog.value) settleDialog(null);
  document.body.innerHTML = "";
});

describe("AppDialog", () => {
  it("resolves true on confirm and false on cancel", async () => {
    const wrapper = mountDialog();

    const yes = confirmDialog({ message: "Sure?" });
    await nextTick();
    expect(wrapper.text()).toContain("Sure?");
    expect(wrapper.text()).toContain("common.ok");
    await wrapper.get("form").trigger("submit");
    expect(await yes).toBe(true);

    const no = confirmDialog({ message: "Really?" });
    await nextTick();
    await wrapper.get("button[type='button']").trigger("click");
    expect(await no).toBe(false);
    await nextTick();
    expect(wrapper.find("[role='alertdialog']").exists()).toBe(false);
  });

  it("starts a destructive dialog on Cancel, and Escape cancels", async () => {
    const wrapper = mountDialog();

    const answer = confirmDialog({ message: "Delete it?", danger: true });
    await nextTick();
    await settled();
    expect(wrapper.text()).toContain("common.delete");
    expect(document.activeElement?.textContent?.trim()).toBe("common.cancel");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(await answer).toBe(false);
  });

  it("returns the typed text from a prompt, or null when cancelled", async () => {
    const wrapper = mountDialog();

    const typed = promptDialog({ message: "UUID?", defaultValue: "abc" });
    await nextTick();
    const input = wrapper.get("input");
    expect((input.element as HTMLInputElement).value).toBe("abc");
    await input.setValue("1234");
    await wrapper.get("form").trigger("submit");
    expect(await typed).toBe("1234");

    const cancelled = promptDialog({ message: "UUID?" });
    await nextTick();
    await wrapper.get("button[type='button']").trigger("click");
    expect(await cancelled).toBeNull();
  });

  it("shows queued dialogs one at a time, in order", async () => {
    const wrapper = mountDialog();

    const first = confirmDialog({ message: "First" });
    const second = confirmDialog({ message: "Second" });
    await nextTick();
    expect(wrapper.text()).toContain("First");
    expect(wrapper.text()).not.toContain("Second");

    await wrapper.get("form").trigger("submit");
    await nextTick();
    expect(wrapper.text()).toContain("Second");
    await wrapper.get("button[type='button']").trigger("click");

    expect(await first).toBe(true);
    expect(await second).toBe(false);
  });

  it("a read-only prompt only offers its value to copy", async () => {
    const wrapper = mountDialog();

    promptDialog({ message: "Copy", defaultValue: "ABCD1234", readOnly: true });
    await nextTick();
    expect(wrapper.get("input").attributes("readonly")).toBeDefined();
    expect(wrapper.findAll("button")).toHaveLength(1);
  });
});
