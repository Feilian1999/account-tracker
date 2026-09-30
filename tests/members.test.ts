import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { Book, RecordItem, UserProfile } from "../src/stores/types";
import {
  isSelf,
  memberInitial,
  memberRecordCount,
  validateMembers,
} from "../src/utils/member";

const api = vi.hoisted(() => ({
  shareBookToCloud: vi.fn(),
  fetchSharedBook: vi.fn(),
  updateSharedBook: vi.fn(async () => ({ data: { status: "ok" } })),
}));
vi.mock("../src/utils/api", () => api);

import { setupBookActions } from "../src/stores/books";

const profile: UserProfile = {
  id: "secret-backup-id",
  memberId: "my-public-id",
  name: "Allen",
  theme: "sheep",
  animations: false,
};

const record = (overrides: Partial<RecordItem>): RecordItem => ({
  id: crypto.randomUUID(),
  bookId: "b1",
  type: "expense",
  amount: 100,
  category: "飲食",
  date: "2026-09-30",
  note: "",
  paidById: "a",
  splitAmongIds: ["a"],
  isSynced: true,
  ...overrides,
});

const setup = (book: Book, records: RecordItem[] = []) => {
  const books = ref<Book[]>([book]);
  const recs = ref(records);
  const pendingDeleteMemberIds = ref<string[]>([]);
  const actions = setupBookActions(
    books,
    recs,
    ref<string | null>(null),
    ref({ ...profile }),
    ref<string[]>([]),
    ref<string[]>([]),
    pendingDeleteMemberIds,
    vi.fn(async () => {}),
  );
  return { books, records: recs, pendingDeleteMemberIds, ...actions };
};

describe("member utils", () => {
  it("takes the first character, uppercased", () => {
    expect(memberInitial(" allen")).toBe("A");
    expect(memberInitial("小明")).toBe("小");
    expect(memberInitial("")).toBe("?");
  });

  it("recognises self by public memberId or the legacy backup id", () => {
    expect(isSelf({ userId: "my-public-id" }, profile)).toBe(true);
    expect(isSelf({ userId: "secret-backup-id" }, profile)).toBe(true);
    expect(isSelf({ userId: "someone-else" }, profile)).toBe(false);
    expect(isSelf({}, profile)).toBe(false);
  });

  it("flags blank and duplicate (case-insensitive) names", () => {
    const issues = validateMembers([
      { id: "1", name: "Bob" },
      { id: "2", name: " bob " },
      { id: "3", name: "  " },
      { id: "4", name: "Cara" },
    ]);
    expect([...issues.duplicate].sort()).toEqual(["1", "2"]);
    expect([...issues.empty]).toEqual(["3"]);
  });

  it("counts records that involve a member", () => {
    const records = [
      record({ paidById: "a", splitAmongIds: ["b"] }),
      record({
        paidById: "b",
        splitAmongIds: ["c"],
        splitCustomAmounts: { a: 1 },
      }),
      record({ paidById: "c", splitAmongIds: ["all"] }),
      record({ bookId: "other", paidById: "a" }),
    ];
    expect(memberRecordCount(records, "b1", "a")).toBe(3);
    expect(memberRecordCount(records, "b1", "d")).toBe(1); // only the "all" split
  });
});

describe("book members in the store", () => {
  const book = (): Book => ({
    id: "b1",
    name: "Trip",
    createdAt: "2026-09-30T00:00:00Z",
    members: [
      { id: "a", name: "Allen", userId: "my-public-id" },
      { id: "b", name: "Bob", userId: "bobs-public-id" },
      { id: "c", name: "Cara" },
    ],
  });

  it("updates by id: renames keep id and link, new ids are added, missing ids are removed", async () => {
    const income = record({ type: "income", paidById: "", splitAmongIds: [] });
    const store = setup(book(), [income]);
    await store.updateBook("b1", "Trip", [
      { id: "b", name: "Bobby" }, // renamed and moved first
      { id: "a", name: "Allen" },
      { id: "new-id", name: "Dan" },
    ]);
    expect(store.books.value[0].members).toEqual([
      { id: "b", name: "Bobby", userId: "bobs-public-id" },
      { id: "a", name: "Allen", userId: "my-public-id" },
      { id: "new-id", name: "Dan" },
    ]);
    expect(store.pendingDeleteMemberIds.value).toEqual(["c"]);
    // Income records have no payer and must not be reassigned.
    expect(store.records.value[0].paidById).toBe("");
    expect(store.records.value[0].isSynced).toBe(true);
  });

  it("lets an unlinked member be claimed as self", async () => {
    const store = setup(book());
    await store.updateBook("b1", "Trip", [
      { id: "a", name: "Allen", userId: "my-public-id" },
      { id: "b", name: "Bob", userId: "bobs-public-id" },
      { id: "c", name: "Cara", userId: "my-public-id" },
    ]);
    expect(store.books.value[0].members[2].userId).toBe("my-public-id");
    // An existing link is never overwritten by a draft.
    await store.updateBook("b1", "Trip", [
      { id: "b", name: "Bob", userId: "my-public-id" },
      { id: "a", name: "Allen" },
      { id: "c", name: "Cara" },
    ]);
    expect(store.books.value[0].members[0].userId).toBe("bobs-public-id");
  });

  it("creates a book with the given member ids", async () => {
    const store = setup(book());
    const created = await store.createBook(
      " Tokyo ",
      [
        { id: "m1", name: "Allen", userId: "my-public-id" },
        { id: "m2", name: " Bob " },
        { id: "m3", name: "  " },
      ],
      "JPY",
    );
    expect(created?.name).toBe("Tokyo");
    expect(created?.members).toEqual([
      { id: "m1", name: "Allen", userId: "my-public-id" },
      { id: "m2", name: "Bob" },
    ]);
  });
});

describe("joining a shared book", () => {
  const shared = () => ({
    book: {
      id: "shared-book",
      name: "Shared",
      createdAt: "2026-09-30T00:00:00Z",
      members: [
        { id: "x", name: "Xavier", userId: "xaviers-public-id" },
        { id: "y", name: "Allen" },
      ],
    },
    records: [],
  });
  const emptyBook = (): Book => ({
    id: "local",
    name: "L",
    createdAt: "",
    members: [],
  });

  it("never adds a member when joining without claiming one", async () => {
    api.updateSharedBook.mockClear();
    const store = setup(emptyBook());
    const joined = await store.joinSharedBook("CODE1234", shared(), null);
    expect(joined?.members.map((m) => m.id)).toEqual(["x", "y"]);
    expect(joined?.members.some((m) => m.userId === "my-public-id")).toBe(
      false,
    );
    expect(api.updateSharedBook).not.toHaveBeenCalled();
  });

  it("links the claimed member to the public memberId and pushes it", async () => {
    api.updateSharedBook.mockClear();
    const store = setup(emptyBook());
    const joined = await store.joinSharedBook("CODE1234", shared(), "y");
    expect(joined?.members).toHaveLength(2);
    expect(joined?.members[1]).toEqual({
      id: "y",
      name: "Allen",
      userId: "my-public-id",
    });
    expect(api.updateSharedBook).toHaveBeenCalledOnce();
  });

  it("keeps the claim when the auto-pull races the push", async () => {
    // The cloud still has the unclaimed list while our push is in flight.
    api.fetchSharedBook.mockResolvedValue({ data: shared() });
    api.updateSharedBook.mockClear();
    const store = setup(emptyBook());
    await store.joinSharedBook("CODE1234", shared(), "y");
    const calls = api.updateSharedBook.mock.calls as unknown as [
      string,
      { book: Book },
    ][];
    const pushed = calls[0][1].book.members;
    expect(pushed[1].userId).toBe("my-public-id");
    expect(
      store.books.value.find((b) => b.id === "shared-book")?.members[1].userId,
    ).toBe("my-public-id");
    api.fetchSharedBook.mockReset();
  });

  it("refuses to claim a member someone else already linked", async () => {
    const store = setup(emptyBook());
    const joined = await store.joinSharedBook("CODE1234", shared(), "x");
    expect(joined?.members[0].userId).toBe("xaviers-public-id");
  });

  it("recognises a rejoin by the existing link", async () => {
    const store = setup(emptyBook());
    const data = shared();
    data.book.members[1] = { id: "y", name: "Allen", userId: "my-public-id" };
    expect(store.findSelfMember(data.book)?.id).toBe("y");
  });
});
