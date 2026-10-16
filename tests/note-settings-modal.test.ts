import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NoteSettingsModal from "../src/components/NoteSettingsModal.vue";

const { store, dialog } = vi.hoisted(() => ({
  store: {
    savedNotes: [
      {
        id: "a",
        text: "午餐",
        type: "expense",
        pinned: false,
        count: 5,
        categories: {},
        lastUsed: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "b",
        text: "房租",
        type: "expense",
        pinned: true,
        count: 1,
        categories: {},
        lastUsed: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "c",
        text: "薪水",
        type: "income",
        pinned: false,
        count: 3,
        categories: {},
        lastUsed: "2026-10-01T00:00:00.000Z",
      },
    ],
    addSavedNote: vi.fn(async () => true),
    renameSavedNote: vi.fn(),
    setNotePinned: vi.fn(),
    deleteSavedNote: vi.fn(),
  },
  dialog: { confirm: true, prompt: null as string | null },
}));

vi.mock("../src/stores/tracker", () => ({ useTrackerStore: () => store }));
vi.mock("../src/composables/useDialog", () => ({
  confirmDialog: async () => dialog.confirm,
  promptDialog: async () => dialog.prompt,
}));
vi.mock("../src/composables/useToast", () => ({
  useToast: () => ({ info: vi.fn() }),
}));
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mountModal = () =>
  mount(NoteSettingsModal, {
    props: { modelValue: true },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        BaseBottomSheet: {
          template: "<div><slot /><slot name='footer' /></div>",
        },
        BaseButton: {
          template:
            "<button type='button' data-testid='add' @click=\"$emit('click')\"><slot /></button>",
        },
      },
    },
  });

const settled = () => new Promise((r) => setTimeout(r));
const rowTexts = (wrapper: ReturnType<typeof mountModal>) =>
  wrapper.findAll("li").map((li) => li.find("span").text());

describe("NoteSettingsModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists one type's notes, pinned first", async () => {
    const wrapper = mountModal();
    expect(rowTexts(wrapper)).toEqual(["房租", "午餐"]);

    await wrapper.findAll("[role='tab']")[1].trigger("click");
    expect(rowTexts(wrapper)).toEqual(["薪水"]);
  });

  it("pins, renames and deletes (after confirming)", async () => {
    const wrapper = mountModal();
    const row = wrapper.findAll("li")[1]; // 午餐
    const [edit, pin, del] = row.findAll("button");

    await pin.trigger("click");
    expect(store.setNotePinned).toHaveBeenCalledWith("a", true);

    dialog.prompt = "便當";
    await edit.trigger("click");
    await settled();
    expect(store.renameSavedNote).toHaveBeenCalledWith("a", "便當");

    dialog.confirm = false;
    await del.trigger("click");
    await settled();
    expect(store.deleteSavedNote).not.toHaveBeenCalled();
    dialog.confirm = true;
    await del.trigger("click");
    await settled();
    expect(store.deleteSavedNote).toHaveBeenCalledWith("a");
  });

  it("adds a note to the shown type", async () => {
    const wrapper = mountModal();
    await wrapper.findAll("[role='tab']")[1].trigger("click");
    dialog.prompt = "獎金";
    await wrapper.get("[data-testid='add']").trigger("click");
    await settled();
    expect(store.addSavedNote).toHaveBeenCalledWith("income", "獎金");
  });
});
