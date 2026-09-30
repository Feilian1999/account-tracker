import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MemberListEditor from "../src/components/books/MemberListEditor.vue";
import type { MemberDraft } from "../src/utils/member";

const store = {
  userProfile: { id: "secret", memberId: "me", name: "Allen" },
  books: [
    {
      id: "b1",
      members: [
        { id: "me-row", name: "Allen", userId: "me" },
        { id: "bob", name: "Bob" },
        { id: "cara", name: "Cara" },
      ],
    },
    {
      id: "legacy",
      members: [
        { id: "me-row", name: "Allen", userId: "me" },
        { id: "bob", name: "Bob" },
      ],
    },
  ],
  records: [
    {
      id: "r1",
      bookId: "b1",
      type: "expense",
      amount: 100,
      paidById: "bob",
      splitAmongIds: ["bob"],
    },
    // Legacy "all" split: involves every SAVED member of the book.
    {
      id: "r2",
      bookId: "legacy",
      type: "expense",
      amount: 50,
      paidById: "me-row",
      splitAmongIds: ["all"],
    },
  ],
};
vi.mock("../src/stores/tracker", () => ({ useTrackerStore: () => store }));
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: "en" } }),
}));

const mountEditor = (modelValue: MemberDraft[], bookId?: string) =>
  mount(MemberListEditor, {
    props: {
      modelValue,
      bookId,
      "onUpdate:modelValue": (v: MemberDraft[]) =>
        wrapper.setProps({ modelValue: v }),
    },
    global: {
      mocks: { $t: (k: string) => k },
      stubs: { MemberAvatar: { template: "<span />" } },
    },
  });
let wrapper: ReturnType<typeof mountEditor>;

const members = (): MemberDraft[] => [
  { id: "me-row", name: "Allen", userId: "me" },
  { id: "bob", name: "Bob" },
  { id: "cara", name: "Cara" },
];

const addInput = () =>
  wrapper.find('input[placeholder="members.addPlaceholder"]');
const latest = () => wrapper.props("modelValue") as MemberDraft[];

describe("MemberListEditor", () => {
  it("adds a member on Enter with a fresh id", async () => {
    wrapper = mountEditor(members());
    await addInput().setValue("Dan");
    await addInput().trigger("keydown", { key: "Enter" });
    expect(latest().map((m) => m.name)).toEqual([
      "Allen",
      "Bob",
      "Cara",
      "Dan",
    ]);
    expect(latest()[3].id).toMatch(/^[0-9a-f-]{36}$/);
    expect((addInput().element as HTMLInputElement).value).toBe("");
  });

  it("ignores the Enter that commits IME composition", async () => {
    wrapper = mountEditor(members());
    await addInput().setValue("小");
    await addInput().trigger("keydown", { key: "Enter", isComposing: true });
    expect(latest()).toHaveLength(3);
  });

  it("rejects a duplicate name", async () => {
    wrapper = mountEditor(members());
    await addInput().setValue(" bob ");
    await addInput().trigger("keydown", { key: "Enter" });
    expect(latest()).toHaveLength(3);
    expect(wrapper.text()).toContain("members.errorDuplicate");
  });

  it("can't remove yourself or a member with records", () => {
    wrapper = mountEditor(members(), "b1");
    const removeButtons = wrapper.findAll(
      'button[aria-label^="members.remove"]',
    );
    // No remove button for "me"; Bob has a record, Cara doesn't.
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0].attributes("disabled")).toBeDefined();
    expect(removeButtons[1].attributes("disabled")).toBeUndefined();
    expect(wrapper.text()).toContain("members.recordCount");
  });

  it("lets a just-added row be removed even when a legacy 'all' split exists", async () => {
    wrapper = mountEditor(
      [
        { id: "me-row", name: "Allen", userId: "me" },
        { id: "bob", name: "Bob" },
      ],
      "legacy",
    );
    await addInput().setValue("Dan");
    await addInput().trigger("keydown", { key: "Enter" });
    const removes = wrapper.findAll('button[aria-label^="members.remove"]');
    // Bob is in the "all" split → locked; the unsaved Dan row is not.
    expect(removes[0].attributes("disabled")).toBeDefined();
    expect(removes[1].attributes("disabled")).toBeUndefined();
    await removes[1].trigger("click");
    expect(latest().map((m) => m.name)).toEqual(["Allen", "Bob"]);
  });

  it("removes a member", async () => {
    wrapper = mountEditor(members(), "b1");
    await wrapper
      .findAll('button[aria-label^="members.remove"]')[1]
      .trigger("click");
    expect(latest().map((m) => m.id)).toEqual(["me-row", "bob"]);
  });

  it("offers 'this is me' only when no member is you", async () => {
    wrapper = mountEditor([{ id: "bob", name: "Bob" }]);
    const claim = wrapper
      .findAll("button")
      .find((b) => b.text() === "members.thisIsMe");
    expect(claim).toBeDefined();
    await claim!.trigger("click");
    expect(latest()[0].userId).toBe("me");
    expect(
      wrapper.findAll("button").some((b) => b.text() === "members.thisIsMe"),
    ).toBe(false);
  });

  it("flushes a typed-but-not-added name before save", async () => {
    wrapper = mountEditor(members());
    await addInput().setValue("Dan");
    expect(
      (wrapper.vm as unknown as { flushPending: () => boolean }).flushPending(),
    ).toBe(true);
    await wrapper.vm.$nextTick(); // setProps (the test's v-model) is async
    expect(latest().map((m) => m.name)).toContain("Dan");
  });
});
