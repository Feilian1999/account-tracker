import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { Book, RecordItem, UserProfile } from "../src/stores/types";
import type { SharedDocState } from "../src/utils/crdt";

vi.mock("../src/utils/api", async () => {
  const { createFakeServer } = await import("./helpers/fakeSharedServer");
  const server = createFakeServer();
  return { ...server.api, __server: server };
});

import * as api from "../src/utils/api";
import { setupBookActions } from "../src/stores/books";
import { calcMemberStats } from "../src/utils/settlement";

type Server = ReturnType<
  typeof import("./helpers/fakeSharedServer").createFakeServer
>;
const server = (api as unknown as { __server: Server }).__server;

beforeEach(() => {
  vi.stubGlobal("confirm", () => true);
});

/** One device: its own store state, like a separate phone. */
const device = (memberId: string, name: string) => {
  const books = ref<Book[]>([]);
  const records = ref<RecordItem[]>([]);
  const currentBookId = ref<string | null>(null);
  const sharedDocs = ref<Record<string, SharedDocState>>({});
  const pendingDeleteRecordIds = ref<string[]>([]);
  const pendingDeleteMemberIds = ref<string[]>([]);
  const profile = ref<UserProfile>({
    id: `secret-${memberId}`,
    memberId,
    name,
    theme: "sheep",
    animations: false,
  });
  const actions = setupBookActions(
    books,
    records,
    currentBookId,
    profile,
    sharedDocs,
    ref<string[]>([]),
    pendingDeleteRecordIds,
    pendingDeleteMemberIds,
    vi.fn(async () => {}),
  );
  const bookRecords = () =>
    records.value
      .filter((r) => r.bookId === books.value[0]?.id)
      .map((r) => ({
        id: r.id,
        amount: r.amount,
        note: r.note,
        paidById: r.paidById,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    books,
    records,
    currentBookId,
    sharedDocs,
    pendingDeleteRecordIds,
    pendingDeleteMemberIds,
    bookRecords,
    ...actions,
  };
};
type Device = ReturnType<typeof device>;

const expense = (over: Partial<RecordItem> = {}) => ({
  type: "expense" as const,
  amount: 100,
  amountCurrency: "TWD" as const,
  category: "飲食",
  date: "2026-09-30",
  note: "",
  paidById: "",
  splitAmongIds: [] as string[],
  ...over,
});

/** A publishes a 2-member book; B joins as Bob. */
async function sharedPair() {
  const a = device("pub-a", "Allen");
  const b = device("pub-b", "Bob");
  const book = await a.createBook(
    "Trip",
    [
      { id: "ma", name: "Allen", userId: "pub-a" },
      { id: "mb", name: "Bob" },
    ],
    "TWD",
  );
  await a.addRecord(
    expense({ note: "first", paidById: "ma", splitAmongIds: ["ma", "mb"] }),
  );
  const code = (await a.publishBook(book!.id))!;
  const preview = await b.previewSharedBook(code);
  await b.joinSharedBook(code, preview, "mb");
  await a.pullSharedBook(book!.id);
  return { a, b, bookId: book!.id, code };
}

const recordId = (d: Device, note: string) =>
  d.records.value.find((r) => r.note === note)!.id;

describe("shared books over the CRDT", () => {
  it("publish + join: both devices see the same book and B's claim", async () => {
    const { a, b } = await sharedPair();
    expect(a.books.value[0].members).toEqual([
      { id: "ma", name: "Allen", userId: "pub-a" },
      { id: "mb", name: "Bob", userId: "pub-b" },
    ]);
    expect(b.books.value[0].members).toEqual(a.books.value[0].members);
    expect(b.bookRecords()).toEqual(a.bookRecords());
  });

  it("concurrent edits to different records both survive (v1: last push reverted the other)", async () => {
    const { a, b, bookId } = await sharedPair();
    await b.addRecord(
      expense({ note: "b-extra", paidById: "mb", splitAmongIds: ["mb"] }),
    );
    // Neither has pulled the other's change before editing.
    await a.updateRecord(recordId(a, "first"), { note: "first (edited by A)" });
    await b.pullSharedBook(bookId);
    await a.pullSharedBook(bookId);
    await b.pullSharedBook(bookId);
    expect(
      a
        .bookRecords()
        .map((r) => r.note)
        .sort(),
    ).toEqual(["b-extra", "first (edited by A)"]);
    expect(b.bookRecords()).toEqual(a.bookRecords());
  });

  it("a record deleted on A is not resurrected by a stale B (v1: it came back)", async () => {
    const { a, b, bookId } = await sharedPair();
    await a.addRecord(
      expense({ note: "second", paidById: "ma", splitAmongIds: ["ma"] }),
    );
    await a.pullSharedBook(bookId);
    await b.pullSharedBook(bookId);
    await a.deleteRecord(recordId(a, "second"));
    await a.pullSharedBook(bookId);
    // B still has "second" and edits another record without pulling first.
    await b.updateRecord(recordId(b, "first"), { note: "first (B)" });
    await b.pullSharedBook(bookId);
    await a.pullSharedBook(bookId);
    for (const d of [a, b])
      expect(d.bookRecords().map((r) => r.note)).toEqual(["first (B)"]);
  });

  it("edits to different fields of one record merge (v1: whole record replaced)", async () => {
    const { a, b, bookId } = await sharedPair();
    const id = recordId(a, "first");
    await a.updateRecord(id, { amount: 300, splitAmongIds: ["ma", "mb"] });
    await b.updateRecord(id, { note: "dinner" });
    await a.pullSharedBook(bookId);
    await b.pullSharedBook(bookId);
    await a.pullSharedBook(bookId);
    for (const d of [a, b])
      expect(d.bookRecords()).toEqual([
        { id, amount: 300, note: "dinner", paidById: "ma" },
      ]);
  });

  it("removing a member archives them; a concurrent record they paid still settles", async () => {
    const { a, b, bookId } = await sharedPair();
    await a.updateBook(bookId, "Trip", [
      { id: "ma", name: "Allen", userId: "pub-a" },
    ]);
    // Meanwhile B records something Bob paid.
    await b.addRecord(
      expense({
        note: "bob paid",
        amount: 60,
        paidById: "mb",
        splitAmongIds: ["ma", "mb"],
      }),
    );
    await a.pullSharedBook(bookId);
    await b.pullSharedBook(bookId);
    await a.pullSharedBook(bookId);
    for (const d of [a, b]) {
      const members = d.books.value[0].members;
      expect(members.find((m) => m.id === "mb")).toMatchObject({
        archived: true,
      });
      const stats = calcMemberStats(members, d.records.value, "TWD");
      expect(stats.find((s) => s.member.id === "mb")?.paid).toBe(60);
      expect(d.bookRecords().find((r) => r.note === "bob paid")?.paidById).toBe(
        "mb",
      );
    }
  });

  it("an edit made while a sync is in flight is sent right after, not lost", async () => {
    const { a, b, bookId } = await sharedPair();
    const id = recordId(a, "first");
    await a.updateRecord(id, { note: "during-1" });
    const release = server.holdNextSync();
    const syncing = a.pullSharedBook(bookId);
    await a.updateRecord(id, { note: "during-2" }); // staged while the request is held
    release();
    await syncing;
    await a.pullSharedBook(bookId);
    await b.pullSharedBook(bookId);
    expect(b.bookRecords()[0].note).toBe("during-2");
    expect(a.bookRecords()[0].note).toBe("during-2");
  });

  it("upgrades a v1 space: only what the device still owed is sent", async () => {
    const legacyBook: Book = {
      id: "legacy-book",
      name: "Old trip",
      createdAt: "2026-01-01T00:00:00Z",
      members: [
        { id: "ma", name: "Allen", userId: "pub-a" },
        { id: "mb", name: "Bob" },
      ],
    };
    const r = (id: string, note: string): RecordItem => ({
      id,
      bookId: "legacy-book",
      ...expense({ note, paidById: "ma", splitAmongIds: ["ma", "mb"] }),
    });
    // The server has Bob's newer edit of r1; this device's copy of r1 is stale.
    server.seedLegacy("LEGACY01", {
      book: legacyBook,
      records: [r("r1", "edited by Bob"), r("r2", "two")],
    });
    const a = device("pub-a", "Allen");
    a.books.value.push({
      ...legacyBook,
      shareCode: "LEGACY01",
      isSynced: true,
    });
    a.records.value.push(
      { ...r("r1", "stale copy"), isSynced: true },
      { ...r("r2", "two"), isSynced: true },
      { ...r("r3", "added offline"), isSynced: false },
    );
    await a.pullSharedBook("legacy-book");

    expect(a.bookRecords().map((x) => x.note)).toEqual([
      "edited by Bob",
      "two",
      "added offline",
    ]);
    const space = server.spaces.get("LEGACY01")!;
    expect(space.doc).not.toBeNull(); // upgraded
    // The upgrade's response was applied: version moved on, nothing left to send.
    const state = a.sharedDocs.value["legacy-book"];
    expect(state.version).toBeGreaterThan(0);
    expect(state.base).toBeUndefined();
    expect(Object.keys(state.pending.records)).toEqual([]);
    const b = device("pub-b", "Bob");
    await b.joinSharedBook(
      "LEGACY01",
      await b.previewSharedBook("LEGACY01"),
      null,
    );
    expect(b.bookRecords()).toEqual(a.bookRecords());
  });

  it("a v1 write between the legacy read and the upgrade isn't lost", async () => {
    const legacyBook: Book = {
      id: "race-book",
      name: "Race",
      createdAt: "2026-01-01T00:00:00Z",
      members: [{ id: "ma", name: "Allen", userId: "pub-a" }],
    };
    const r = (id: string, note: string): RecordItem => ({
      id,
      bookId: "race-book",
      ...expense({ note, paidById: "ma", splitAmongIds: ["ma"] }),
    });
    server.seedLegacy("RACE0001", {
      book: legacyBook,
      records: [r("r1", "one"), r("r2", "two")],
    });
    const a = device("pub-a", "Allen");
    a.books.value.push({
      ...legacyBook,
      shareCode: "RACE0001",
      isSynced: true,
    });
    a.records.value.push(
      { ...r("r1", "one"), isSynced: true },
      { ...r("r2", "two"), isSynced: true },
      { ...r("r3", "mine, unsent"), isSynced: false },
    );

    // A reads the legacy payload; before its upgrade lands, an old client adds
    // r9 and deletes r2 through v1.
    const release = server.holdNextSync("RACE0001");
    const syncing = a.pullSharedBook("race-book");
    await vi.waitFor(() =>
      expect(
        server.requests.some((q) => q.kind === "sync" && q.code === "RACE0001"),
      ).toBe(true),
    );
    server.v1Write("RACE0001", (legacy) => {
      legacy.records = legacy.records.filter((x) => x.id !== "r2");
      legacy.records.push(r("r9", "old client"));
      legacy.deletedIds = ["r2"];
    });
    release();
    await syncing;

    expect(a.bookRecords().map((x) => x.note)).toEqual([
      "one",
      "mine, unsent",
      "old client",
    ]);
    expect(server.spaces.get("RACE0001")!.doc).not.toBeNull();
    const b = device("pub-b", "Bob");
    await b.joinSharedBook(
      "RACE0001",
      await b.previewSharedBook("RACE0001"),
      null,
    );
    expect(b.bookRecords()).toEqual(a.bookRecords());
  });

  it("joining never adds a member", async () => {
    const { a, code } = await sharedPair();
    const c = device("pub-c", "Cara");
    await c.joinSharedBook(code, await c.previewSharedBook(code), null);
    expect(c.books.value[0].members.map((m) => m.id)).toEqual(["ma", "mb"]);
    await a.pullSharedBook(a.books.value[0].id);
    expect(a.books.value[0].members).toHaveLength(2);
  });

  it("one share request per book, and re-sharing reuses the code", async () => {
    const a = device("pub-a", "Allen");
    const book = await a.createBook(
      "Solo",
      [{ id: "ma", name: "Allen", userId: "pub-a" }],
      "TWD",
    );
    const before = server.requests.filter((q) => q.kind === "create").length;
    const [c1, c2] = await Promise.all([
      a.publishBook(book!.id),
      a.publishBook(book!.id),
    ]);
    expect(c1).toBe(c2);
    expect(await a.publishBook(book!.id)).toBe(c1);
    expect(
      server.requests.filter((q) => q.kind === "create").length - before,
    ).toBe(1);
  });

  it("allows a retry after a failed share", async () => {
    const a = device("pub-a", "Allen");
    const book = await a.createBook(
      "Retry",
      [{ id: "ma", name: "Allen", userId: "pub-a" }],
      "TWD",
    );
    const spy = vi
      .spyOn(api, "createSharedDoc")
      .mockRejectedValueOnce(new Error("offline"));
    await expect(a.publishBook(book!.id)).rejects.toThrow("offline");
    expect(a.books.value[0].shareCode).toBeUndefined();
    expect(await a.publishBook(book!.id)).toMatch(/^CODE/);
    spy.mockRestore();
  });

  it("leaving a shared book locally doesn't delete it for others", async () => {
    const { a, b, bookId } = await sharedPair();
    await b.deleteBook(bookId);
    await a.pullSharedBook(bookId);
    expect(a.bookRecords()).toHaveLength(1);
  });
});
