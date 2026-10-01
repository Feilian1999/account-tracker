import type { Book, Member, RecordItem } from "../stores/types";
import { ZERO, observe, tick } from "./hlc";

/**
 * Shared-book CRDT: a document of entities, each a set of last-writer-wins
 * registers stamped with a hybrid logical clock (utils/hlc.ts). Merging takes
 * the later register per name, so it is commutative, associative and
 * idempotent — replicas converge whatever order changes arrive in. The backend
 * (/api/shared/v2) applies the exact same rules without knowing the schema.
 *
 * Wire format (keep in sync with the backend's CLAUDE.md):
 *   Register  { v: <json>, t: <hlc> }
 *   Entity    { f: {immutable fields}, r: {name: Register}, _v?: server version }
 *   Doc       { book?: Entity, members: {id: Entity}, records: {id: Entity} }
 *
 * Registers are grouped by invariant, not per field: everything that must be
 * consistent together lives in one register, so concurrent edits can't merge
 * into e.g. a custom split that no longer sums to the amount. A `$`-prefixed
 * register's object value is spread when the backend flattens a doc for v1
 * clients.
 */

export interface Reg<T = unknown> {
  v: T;
  t: string;
}
export interface Entity {
  f: Record<string, unknown>;
  r: Record<string, Reg>;
  _v?: number;
}
export interface Doc {
  book?: Entity;
  members: Record<string, Entity>;
  records: Record<string, Entity>;
}

export const emptyDoc = (): Doc => ({ members: {}, records: {} });

// ---- Schema: which fields go in which register ----

/** Amount, payer and split must change together (split sums to the amount). */
const MONEY_KEYS = [
  "type",
  "amount",
  "amountCurrency",
  "original",
  "booked",
  "fx",
  "paidById",
  "splitAmongIds",
  "splitCustomAmounts",
] as const;
const MONEY = "$money";

// ---- Merge ----

function mergeEntityInto(target: Entity, incoming: Entity): boolean {
  let changed = false;
  for (const [k, v] of Object.entries(incoming.f ?? {})) {
    if (!(k in target.f)) {
      target.f[k] = v;
      changed = true;
    }
  }
  for (const [name, reg] of Object.entries(incoming.r ?? {})) {
    const current = target.r[name];
    if (!current || reg.t > current.t) {
      target.r[name] = reg;
      changed = true;
    }
  }
  return changed;
}

const cloneEntity = (e: Entity): Entity => ({ f: { ...e.f }, r: { ...e.r } });

/** Merges `incoming` into `target` in place. Returns whether anything changed. */
export function mergeDoc(target: Doc, incoming: Partial<Doc>): boolean {
  let changed = false;
  if (incoming.book) {
    if (!target.book) {
      target.book = cloneEntity(incoming.book);
      changed = true;
    } else if (mergeEntityInto(target.book, incoming.book)) changed = true;
  }
  for (const key of ["members", "records"] as const) {
    for (const [id, entity] of Object.entries(incoming[key] ?? {})) {
      const current = target[key][id];
      if (!current) {
        target[key][id] = cloneEntity(entity);
        changed = true;
      } else if (mergeEntityInto(current, entity)) changed = true;
    }
  }
  return changed;
}

/** Feeds every timestamp in `doc` to the clock (receive event). */
export function observeDoc(doc: Partial<Doc>): void {
  const all = [
    ...(doc.book ? [doc.book] : []),
    ...Object.values(doc.members ?? {}),
    ...Object.values(doc.records ?? {}),
  ];
  for (const e of all)
    for (const reg of Object.values(e.r ?? {})) observe(reg.t);
}

/**
 * Removes from `pending` the registers the server acknowledged (`sent`), but
 * only where pending still holds that exact write — a newer local edit made
 * while the request was in flight stays pending.
 */
export function ackPending(pending: Doc, sent: Doc): void {
  const ack = (p: Entity | undefined, s: Entity) => {
    if (!p) return true;
    for (const [name, reg] of Object.entries(s.r)) {
      if (p.r[name]?.t === reg.t) delete p.r[name];
    }
    for (const k of Object.keys(s.f)) delete p.f[k];
    return Object.keys(p.r).length === 0;
  };
  if (sent.book && ack(pending.book, sent.book)) delete pending.book;
  for (const key of ["members", "records"] as const) {
    for (const [id, s] of Object.entries(sent[key])) {
      if (ack(pending[key][id], s)) delete pending[key][id];
    }
  }
}

export const isEmptyDoc = (doc: Doc) =>
  !doc.book &&
  Object.keys(doc.members).length === 0 &&
  Object.keys(doc.records).length === 0;

// ---- Value normalisation (for change detection) ----

/** JSON-stable form: undefined dropped, object keys sorted. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = canonical(v);
    }
    return out;
  }
  return value === undefined ? null : value;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

// ---- Local state → registers ----

const moneyOf = (r: RecordItem) =>
  canonical(Object.fromEntries(MONEY_KEYS.map((k) => [k, r[k]])));

function recordValues(r: RecordItem): Record<string, unknown> {
  return {
    [MONEY]: moneyOf(r),
    category: r.category,
    date: r.date,
    note: r.note ?? "",
    deleted: false,
  };
}
const memberValues = (m: Member): Record<string, unknown> => ({
  name: m.name,
  userId: m.userId ?? null,
  archived: !!m.archived,
});
const bookValues = (b: Book): Record<string, unknown> => ({
  name: b.name,
  currency: b.currency ?? null,
});

/**
 * Stages local edits of one book as new registers: every value that differs
 * from the doc gets a fresh timestamp. Records the doc has but the local list
 * doesn't were deleted locally → `deleted: true`. Writes into both `doc` (so
 * materialising keeps the edit) and `pending` (what still has to be sent).
 * Returns whether anything was staged.
 */
export function stageLocal(
  doc: Doc,
  pending: Doc,
  book: Book,
  records: RecordItem[],
  memberOrder: (index: number) => string = () => tick(),
): boolean {
  let staged = false;
  const put = (
    key: "book" | "members" | "records",
    id: string,
    f: Record<string, unknown>,
    values: Record<string, unknown>,
  ) => {
    const current =
      key === "book" ? doc.book : (doc[key] as Record<string, Entity>)[id];
    const changes: Entity = { f: {}, r: {} };
    for (const [k, v] of Object.entries(f)) {
      if (!current || !(k in current.f)) changes.f[k] = v;
    }
    for (const [name, v] of Object.entries(values)) {
      if (!current?.r[name] || !same(current.r[name].v, v)) {
        changes.r[name] = { v: canonical(v), t: tick() };
      }
    }
    if (!Object.keys(changes.f).length && !Object.keys(changes.r).length)
      return;
    staged = true;
    if (key === "book") {
      mergeDoc(doc, { book: changes, members: {}, records: {} });
      mergeDoc(pending, { book: changes, members: {}, records: {} });
    } else {
      const part = {
        members: {},
        records: {},
        [key]: { [id]: changes },
      } as Doc;
      mergeDoc(doc, part);
      mergeDoc(pending, part);
    }
  };

  put(
    "book",
    book.id,
    { id: book.id, createdAt: book.createdAt },
    bookValues(book),
  );
  book.members.forEach((m, i) =>
    put(
      "members",
      m.id,
      // Creation stamp orders members; only minted for a member new to the doc.
      doc.members[m.id] ? {} : { id: m.id, created: memberOrder(i) },
      memberValues(m),
    ),
  );
  const localIds = new Set<string>();
  for (const r of records) {
    localIds.add(r.id);
    put("records", r.id, { id: r.id, bookId: book.id }, recordValues(r));
  }
  // Deleted locally: still live in the doc, gone from the local list.
  for (const [id, entity] of Object.entries(doc.records)) {
    if (!localIds.has(id) && entity.r.deleted?.v !== true) {
      put("records", id, {}, { deleted: true });
    }
  }
  return staged;
}

/** A doc for a book shared for the first time: everything stamped now. */
export function docFromLocal(book: Book, records: RecordItem[]): Doc {
  const doc = emptyDoc();
  stageLocal(doc, emptyDoc(), book, records);
  return doc;
}

/**
 * Deterministic conversion of a v1 payload {book, records, deletedIds?} to a
 * doc, every register at ZERO. Two devices converting the same legacy space
 * produce the same doc, so racing "base" uploads merge to one state, and any
 * real edit afterwards beats the converted values.
 */
export function legacyToDoc(payload: {
  book: Book;
  records: RecordItem[];
  deletedIds?: string[];
}): Doc {
  const doc = emptyDoc();
  const zero = (values: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, { v: canonical(v), t: ZERO }]),
    );
  const b = payload.book;
  doc.book = {
    f: { id: b.id, createdAt: b.createdAt },
    r: zero(bookValues(b)),
  };
  b.members.forEach((m, i) => {
    doc.members[m.id] = {
      // Keeps the v1 member order; sorts before any member added later.
      f: { id: m.id, created: `${ZERO}:${String(i).padStart(5, "0")}` },
      r: zero(memberValues(m)),
    };
  });
  for (const r of payload.records) {
    doc.records[r.id] = {
      f: { id: r.id, bookId: b.id },
      r: zero(recordValues(r)),
    };
  }
  for (const id of payload.deletedIds ?? []) {
    doc.records[id] ??= { f: { id, bookId: b.id }, r: {} };
    doc.records[id].r.deleted = { v: true, t: ZERO };
  }
  return doc;
}

// ---- Registers → local state ----

const valueOf = <T>(e: Entity, name: string, fallback: T): T =>
  e.r[name] ? (e.r[name].v as T) : fallback;
const orUndefined = <T>(v: T | null | undefined) =>
  v === null ? undefined : v;

export interface Materialized {
  book: Pick<Book, "id" | "name" | "createdAt" | "currency" | "members">;
  records: RecordItem[];
}

/** The book and live records a doc describes, in the app's own shapes. */
export function materialize(doc: Doc, bookId: string): Materialized {
  const b = doc.book ?? { f: {}, r: {} };
  const members = Object.entries(doc.members)
    .sort(([ia, a], [ib, b2]) => {
      const ca = String(a.f.created ?? "");
      const cb = String(b2.f.created ?? "");
      return ca < cb ? -1 : ca > cb ? 1 : ia < ib ? -1 : 1;
    })
    .map(([id, e]): Member => {
      const m: Member = { id, name: valueOf(e, "name", "") };
      const userId = orUndefined(valueOf<string | null>(e, "userId", null));
      if (userId) m.userId = userId;
      if (valueOf(e, "archived", false)) m.archived = true;
      return m;
    });

  const records: RecordItem[] = [];
  for (const [id, e] of Object.entries(doc.records)) {
    if (valueOf<boolean>(e, "deleted", false) === true || !e.r[MONEY]) continue;
    const money = Object.fromEntries(
      Object.entries(valueOf<Record<string, unknown>>(e, MONEY, {})).map(
        ([k, v]) => [k, orUndefined(v)],
      ),
    );
    records.push({
      ...(money as Partial<RecordItem>),
      id,
      bookId,
      type: (money.type as RecordItem["type"]) ?? "expense",
      amount: Number(money.amount ?? 0),
      paidById: (money.paidById as string) ?? "",
      splitAmongIds: (money.splitAmongIds as string[]) ?? [],
      category: valueOf(e, "category", ""),
      date: valueOf(e, "date", ""),
      note: valueOf(e, "note", ""),
    });
  }
  records.sort((a, b2) => (a.id < b2.id ? -1 : 1));

  return {
    book: {
      id: bookId,
      name: valueOf(b, "name", ""),
      createdAt: String(b.f.createdAt ?? ""),
      currency: orUndefined(valueOf(b, "currency", null)) ?? undefined,
      members,
    },
    records,
  };
}

/** Ids of entities with a register still waiting to be sent. */
export const pendingIds = (pending: Doc) => ({
  book: !!pending.book,
  members: new Set(Object.keys(pending.members)),
  records: new Set(Object.keys(pending.records)),
});

/**
 * Per shared book, persisted in IndexedDB (STORAGE_KEYS.SHARED_DOCS):
 * - `doc`: this device's replica, local edits included;
 * - `pending`: registers not yet acknowledged by the server;
 * - `version`: the server version this replica has seen (the `since` of the
 *   next sync);
 * - `base`: set while a v1 space is being upgraded — the deterministic
 *   conversion to send once, so the server can start the doc from it.
 */
export interface SharedDocState {
  code: string;
  version: number;
  doc: Doc;
  pending: Doc;
  base?: Doc;
  /** Server fingerprint of the v1 payload `base` was converted from. */
  baseOf?: string;
}
