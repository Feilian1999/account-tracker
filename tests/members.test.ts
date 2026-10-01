import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { Book, RecordItem, UserProfile } from "../src/stores/types";
import {
  isSelf,
  memberInitial,
  memberRecordCount,
  validateMembers,
} from "../src/utils/member";

vi.mock("../src/utils/api", async () => {
  const { createFakeServer } = await import("./helpers/fakeSharedServer");
  const server = createFakeServer();
  return { ...server.api, __server: server };
});
import * as api from "../src/utils/api";
type Server = ReturnType<
  typeof import("./helpers/fakeSharedServer").createFakeServer
>;
const server = (api as unknown as { __server: Server }).__server;

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
    ref({}),
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
  let n = 0;
  /** A space with Xavier (linked to someone else) and an unlinked "Allen". */
  const seed = (allenUserId?: string) => {
    const code = `JOIN${String(++n).padStart(4, "0")}`;
    server.seedLegacy(code, {
      book: {
        id: `shared-book-${n}`,
        name: "Shared",
        createdAt: "2026-09-30T00:00:00Z",
        members: [
          { id: "x", name: "Xavier", userId: "xaviers-public-id" },
          {
            id: "y",
            name: "Allen",
            ...(allenUserId ? { userId: allenUserId } : {}),
          },
        ],
      },
      records: [],
    });
    return code;
  };
  const emptyBook = (): Book => ({
    id: "local",
    name: "L",
    createdAt: "",
    members: [],
  });
  const joinedMembers = (store: ReturnType<typeof setup>, code: string) =>
    store.books.value.find((b) => b.shareCode === code)!.members;

  it("never adds a member when joining without claiming one", async () => {
    const code = seed();
    const store = setup(emptyBook());
    await store.joinSharedBook(code, await store.previewSharedBook(code), null);
    expect(joinedMembers(store, code).map((m) => m.id)).toEqual(["x", "y"]);
    expect(
      joinedMembers(store, code).some((m) => m.userId === "my-public-id"),
    ).toBe(false);
  });

  it("links the claimed member to the public memberId, on the server too", async () => {
    const code = seed();
    const store = setup(emptyBook());
    await store.joinSharedBook(code, await store.previewSharedBook(code), "y");
    expect(joinedMembers(store, code)[1]).toEqual({
      id: "y",
      name: "Allen",
      userId: "my-public-id",
    });
    const other = setup(emptyBook());
    const seen = await other.previewSharedBook(code);
    expect(seen.book.members[1].userId).toBe("my-public-id");
  });

  it("refuses to claim a member someone else already linked", async () => {
    const code = seed();
    const store = setup(emptyBook());
    await store.joinSharedBook(code, await store.previewSharedBook(code), "x");
    expect(joinedMembers(store, code)[0].userId).toBe("xaviers-public-id");
  });

  it("recognises a rejoin by the existing link", async () => {
    const code = seed("my-public-id");
    const store = setup(emptyBook());
    const preview = await store.previewSharedBook(code);
    expect(store.findSelfMember(preview.book)?.id).toBe("y");
  });
});
