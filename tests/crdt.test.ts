import { beforeEach, describe, expect, it } from "vitest";
import {
  ackPending,
  docFromLocal,
  emptyDoc,
  legacyToDoc,
  materialize,
  mergeDoc,
  stageLocal,
  type Doc,
} from "../src/utils/crdt";
import {
  _setNow,
  decode,
  initClock,
  observe,
  tick,
  ZERO,
} from "../src/utils/hlc";
import type { Book, RecordItem } from "../src/stores/types";

let fakeNow = 1_000_000;
beforeEach(() => {
  fakeNow = 1_000_000;
  _setNow(() => fakeNow);
  initClock({ node: "nodeA", l: 0, c: 0 });
});

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const book = (): Book => ({
  id: "b1",
  name: "Trip",
  createdAt: "2026-09-30T00:00:00Z",
  currency: "TWD",
  members: [
    { id: "m1", name: "Allen", userId: "u1" },
    { id: "m2", name: "Bob" },
  ],
});
const rec = (id: string, over: Partial<RecordItem> = {}): RecordItem => ({
  id,
  bookId: "b1",
  type: "expense",
  amount: 100,
  amountCurrency: "TWD",
  category: "飲食",
  date: "2026-09-30",
  note: "",
  paidById: "m1",
  splitAmongIds: ["m1", "m2"],
  ...over,
});

/** A replica: its doc plus the local view materialised from it. */
const replica = (doc: Doc, node: string) => ({
  doc: clone(doc),
  pending: emptyDoc(),
  node,
});
const onNode = <T>(node: string, fn: () => T): T => {
  initClock({ node, l: fakeNow, c: 0 });
  return fn();
};
const view = (doc: Doc) => materialize(doc, "b1");

describe("hlc", () => {
  it("is monotonic even if the wall clock goes backwards", () => {
    const a = tick();
    fakeNow -= 5000;
    const b = tick();
    expect(b > a).toBe(true);
  });

  it("stamps after anything observed, even from a clock that runs ahead", () => {
    const remote = `${(fakeNow + 60_000).toString(36).padStart(10, "0")}-00000-nodeB`;
    observe(remote);
    expect(tick() > remote).toBe(true);
  });

  it("orders ZERO below every real stamp", () => {
    expect(tick() > ZERO).toBe(true);
    expect(decode(ZERO)).toBeNull();
  });
});

describe("merge", () => {
  const randomDoc = (seed: number): Doc => {
    const doc = emptyDoc();
    const rnd = (n: number) =>
      ((seed = (seed * 9301 + 49297) % 233280) / 233280) * n;
    for (let i = 0; i < 6; i++) {
      const id = `r${Math.floor(rnd(4))}`;
      // A stamp identifies one write (it carries the node id), so equal
      // stamps always carry equal values — derive the value from the stamp.
      const t = `t${Math.floor(rnd(20)).toString().padStart(2, "0")}`;
      doc.records[id] = { f: { id }, r: { note: { v: `note-${t}`, t } } };
    }
    return doc;
  };
  const merged = (...docs: Doc[]) => {
    const out = emptyDoc();
    for (const d of docs) mergeDoc(out, clone(d));
    return JSON.stringify(out, Object.keys(out).sort());
  };

  it("is commutative, associative and idempotent", () => {
    for (let s = 1; s < 40; s++) {
      const [a, b, c] = [randomDoc(s), randomDoc(s * 7), randomDoc(s * 13)];
      const norm = (docs: Doc[]) => {
        const out = emptyDoc();
        for (const d of docs) mergeDoc(out, clone(d));
        // compare register values only (object insertion order may differ)
        return Object.fromEntries(
          Object.entries(out.records)
            .sort()
            .map(([id, e]) => [id, e.r.note]),
        );
      };
      expect(norm([a, b, c])).toEqual(norm([c, a, b]));
      expect(norm([a, b, c])).toEqual(norm([b, c, a, a, b]));
    }
    expect(merged(randomDoc(3), randomDoc(3))).toBe(merged(randomDoc(3)));
  });
});

describe("replicas", () => {
  it("round-trips a book through a doc", () => {
    const doc = docFromLocal(book(), [rec("r1", { note: "lunch" })]);
    const v = view(doc);
    expect(v.book).toMatchObject({ name: "Trip", currency: "TWD" });
    expect(v.book.members.map((m) => m.name)).toEqual(["Allen", "Bob"]);
    expect(v.records[0]).toMatchObject({
      id: "r1",
      amount: 100,
      note: "lunch",
      splitAmongIds: ["m1", "m2"],
    });
  });

  it("stages nothing when nothing changed", () => {
    const doc = docFromLocal(book(), [rec("r1")]);
    const pending = emptyDoc();
    const v = view(doc);
    expect(stageLocal(doc, pending, { ...book(), ...v.book }, v.records)).toBe(
      false,
    );
  });

  it("keeps both of two concurrent edits to different fields of one record", () => {
    const base = docFromLocal(book(), [rec("r1")]);
    const a = replica(base, "A");
    const b = replica(base, "B");

    fakeNow += 1000;
    onNode("A", () =>
      stageLocal(a.doc, a.pending, book(), [
        { ...view(a.doc).records[0], amount: 250, splitAmongIds: ["m1"] },
      ]),
    );
    fakeNow += 1000;
    onNode("B", () =>
      stageLocal(b.doc, b.pending, book(), [
        { ...view(b.doc).records[0], note: "dinner" },
      ]),
    );

    mergeDoc(a.doc, clone(b.pending));
    mergeDoc(b.doc, clone(a.pending));
    for (const r of [a, b]) {
      expect(view(r.doc).records[0]).toMatchObject({
        amount: 250,
        splitAmongIds: ["m1"],
        note: "dinner",
      });
    }
  });

  it("keeps amount and split consistent: the later money edit wins as a whole", () => {
    const base = docFromLocal(book(), [rec("r1")]);
    const a = replica(base, "A");
    const b = replica(base, "B");
    fakeNow += 1000;
    onNode("A", () =>
      stageLocal(a.doc, a.pending, book(), [
        {
          ...view(a.doc).records[0],
          amount: 300,
          splitCustomAmounts: { m1: 100, m2: 200 },
        },
      ]),
    );
    fakeNow += 1000;
    onNode("B", () =>
      stageLocal(b.doc, b.pending, book(), [
        { ...view(b.doc).records[0], amount: 50 },
      ]),
    );
    mergeDoc(a.doc, clone(b.pending));
    const r = view(a.doc).records[0];
    expect(r.amount).toBe(50);
    expect(r.splitCustomAmounts).toBeUndefined(); // not A's split with B's amount
  });

  it("does not resurrect a record deleted on another replica", () => {
    const base = docFromLocal(book(), [rec("r1"), rec("r2")]);
    const a = replica(base, "A");
    const stale = replica(base, "B");
    fakeNow += 1000;
    onNode("A", () =>
      stageLocal(a.doc, a.pending, book(), [view(a.doc).records[1]]),
    ); // delete r1
    fakeNow += 1000;
    // The stale replica edits r2 without having seen the delete, and sends it.
    onNode("B", () =>
      stageLocal(
        stale.doc,
        stale.pending,
        book(),
        view(stale.doc).records.map((r) =>
          r.id === "r2" ? { ...r, note: "edited" } : r,
        ),
      ),
    );
    mergeDoc(a.doc, clone(stale.pending));
    expect(view(a.doc).records.map((r) => [r.id, r.note])).toEqual([
      ["r2", "edited"],
    ]);
  });

  it("archives a removed member instead of dropping them", () => {
    const doc = docFromLocal(book(), []);
    const pending = emptyDoc();
    fakeNow += 1000;
    const b = {
      ...book(),
      members: [book().members[0], { ...book().members[1], archived: true }],
    };
    stageLocal(doc, pending, b, []);
    expect(view(doc).book.members[1]).toMatchObject({
      id: "m2",
      archived: true,
    });
  });

  it("converts a v1 payload deterministically, below any real edit", () => {
    const payload = {
      book: book(),
      records: [rec("r1")],
      deletedIds: ["gone"],
    };
    expect(JSON.stringify(legacyToDoc(clone(payload)))).toBe(
      JSON.stringify(legacyToDoc(clone(payload))),
    );
    const doc = legacyToDoc(payload);
    expect(view(doc).records.map((r) => r.id)).toEqual(["r1"]);
    expect(view(doc).book.members.map((m) => m.id)).toEqual(["m1", "m2"]);
    const pending = emptyDoc();
    stageLocal(doc, pending, book(), [{ ...view(doc).records[0], note: "x" }]);
    expect(view(doc).records[0].note).toBe("x");
  });

  it("acks only the writes that were sent", () => {
    const doc = docFromLocal(book(), [rec("r1")]);
    const pending = emptyDoc();
    fakeNow += 1000;
    stageLocal(doc, pending, book(), [
      { ...view(doc).records[0], note: "first" },
    ]);
    const sent = clone(pending);
    fakeNow += 1000;
    stageLocal(doc, pending, book(), [
      { ...view(doc).records[0], note: "second" },
    ]); // while in flight
    ackPending(pending, sent);
    expect(pending.records.r1?.r.note?.v).toBe("second");
    ackPending(pending, clone(pending));
    expect(pending.records).toEqual({});
  });
});
