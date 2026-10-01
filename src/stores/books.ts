import type { Ref } from "vue";
import { computed, toRaw, watch } from "vue";
import type { Book, CurrencyCode, RecordItem, Member, Settlement, UserProfile } from "./types";
import { createSharedDoc, getSharedDoc, syncSharedDoc } from "../utils/api";
import { calcMemberCategoryBreakdown, type MemberCategoryBreakdown } from "../utils/memberBreakdown";
import { calcMemberStats, calcSettlements } from "../utils/settlement";
import { currencyOf, decimalsOf } from "../utils/currency";
import { isSelf, type MemberDraft } from "../utils/member";
import {
  ackPending,
  docFromLocal,
  emptyDoc,
  isEmptyDoc,
  legacyToDoc,
  materialize,
  mergeDoc,
  observeDoc,
  pendingIds,
  stageLocal,
  type Doc,
  type SharedDocState,
} from "../utils/crdt";
import { i18n } from "../i18n";

// ---- Debounce helper (keyed by the first argument) ----
// A shared timer would let a mutation on book B cancel book A's pending sync,
// stranding A's changes locally. Keep one timer per key (bookId).
function debouncePerKey(fn: (key: string) => any, ms: number): (key: string) => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return (key: string) => {
    const prev = timers.get(key);
    if (prev) clearTimeout(prev);
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      fn(key);
    }, ms));
  };
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** What a join preview shows, plus the doc to adopt when the user confirms. */
export interface SharedBookPreview {
  book: Book;
  records: RecordItem[];
  doc: Doc;
  version: number;
  /** The space is still v1; joining upgrades it (sends `doc` as the base). */
  legacy: boolean;
  legacyHash?: string;
}

/**
 * Book CRUD, settlement, and shared-book sync actions.
 */
export function setupBookActions(
  books: Ref<Book[]>,
  records: Ref<RecordItem[]>,
  currentBookId: Ref<string | null>,
  userProfile: Ref<UserProfile>,
  sharedDocs: Ref<Record<string, SharedDocState>>,
  pendingDeleteBookIds: Ref<string[]>,
  pendingDeleteRecordIds: Ref<string[]>,
  pendingDeleteMemberIds: Ref<string[]>,
  save: () => Promise<void>
) {
  // ---- Computed ----
  const currentBook = computed(
    () => books.value.find((b) => b.id === currentBookId.value) ?? null
  );

  const currentBookRecords = computed(() =>
    records.value.filter((r) => r.bookId === currentBookId.value)
  );

  /** Every record's `amount` in a book is in the book currency. */
  const currentBookCurrency = computed<CurrencyCode>(() => currencyOf(currentBook.value?.currency));

  // Auto-pull when current book changes
  watch(currentBookId, (newId) => {
    if (newId) pullSharedBook(newId);
  }, { immediate: true });

  // =====================
  //  Shared Book Sync — CRDT (utils/crdt.ts, /api/shared/v2)
  // =====================
  //
  // Each shared book keeps a replica doc. The local Book/records are always
  // materialize(doc): a mutation is staged into the doc synchronously (so a
  // pull arriving before the debounced push can't wipe it), then sent. A sync
  // sends the pending registers and receives everything newer than `version`
  // in one round trip; merging is order-independent, so there is nothing to
  // "win" by arriving last.

  const recordsOf = (bookId: string) => records.value.filter((r) => r.bookId === bookId);

  /** Stages the book's local edits into its doc. No-op until it has one. */
  const stage = (bookId: string) => {
    const state = sharedDocs.value[bookId];
    const book = books.value.find((b) => b.id === bookId);
    if (!state || !book) return false;
    return stageLocal(state.doc, state.pending, book, recordsOf(bookId));
  };

  /** Rewrites the local book and its records from the doc. */
  const applyDoc = (bookId: string) => {
    const state = sharedDocs.value[bookId];
    const book = books.value.find((b) => b.id === bookId);
    if (!state || !book) return;
    const view = materialize(state.doc, bookId);
    const pending = pendingIds(state.pending);
    book.name = view.book.name;
    book.currency = view.book.currency;
    book.members = view.book.members;
    book.isSynced = !pending.book && pending.members.size === 0;
    records.value = [
      ...records.value.filter((r) => r.bookId !== bookId),
      ...view.records.map((r) => ({ ...r, isSynced: !pending.records.has(r.id) })),
    ];
  };

  /**
   * First sync of a book shared before v2 (it has a shareCode but no doc):
   * adopt the server's state and stage ONLY what this device still owed —
   * records marked unsynced, tombstones and a pending book edit. The rest of
   * the local copy may be stale, and re-sending it is exactly how v1 reverted
   * other people's edits.
   */
  const firstContact = async (book: Book): Promise<SharedDocState> => {
    const res = await getSharedDoc(book.shareCode!, 0);
    const legacy = res.data.legacy;
    const doc = legacy ? legacyToDoc(legacy) : (res.data.doc ?? emptyDoc());
    if (!legacy) observeDoc(doc);
    const state: SharedDocState = {
      code: book.shareCode!,
      version: legacy ? 0 : res.data.version,
      doc,
      pending: emptyDoc(),
      ...(legacy ? { base: clone(doc), baseOf: res.data.legacyHash } : {}),
    };

    const view = materialize(doc, book.id);
    const deleted = new Set(pendingDeleteRecordIds.value);
    const unsynced = recordsOf(book.id).filter((r) => r.isSynced === false);
    const unsyncedIds = new Set(unsynced.map((r) => r.id));
    const localRecords = [
      ...view.records.filter((r) => !unsyncedIds.has(r.id) && !deleted.has(r.id)),
      ...unsynced,
    ];
    const archivedIds = new Set(pendingDeleteMemberIds.value);
    const localBook: Book = {
      ...book,
      ...(book.isSynced === false
        ? {}
        : { name: view.book.name, currency: view.book.currency, members: view.book.members }),
    };
    localBook.members = [
      ...localBook.members.map((m) => (archivedIds.has(m.id) ? { ...m, archived: true } : m)),
      // Members the device already dropped under v1: keep them, archived.
      ...view.book.members
        .filter((m) => archivedIds.has(m.id) && !localBook.members.some((l) => l.id === m.id))
        .map((m) => ({ ...m, archived: true })),
    ];
    stageLocal(state.doc, state.pending, localBook, localRecords);

    // Those v1 tombstones are now CRDT tombstones.
    const docIds = new Set([...Object.keys(doc.records), ...Object.keys(doc.members)]);
    pendingDeleteRecordIds.value = pendingDeleteRecordIds.value.filter((id) => !docIds.has(id));
    pendingDeleteMemberIds.value = pendingDeleteMemberIds.value.filter((id) => !docIds.has(id));

    sharedDocs.value[book.id] = state;
    // Replace the (possibly stale) local copy with the doc right away: the
    // next stage() diffs the local list against the doc, and the stale copy
    // would otherwise be staged as fresh edits.
    applyDoc(book.id);
    return state;
  };

  /**
   * The v1 payload changed since `base` was converted (an old client wrote in
   * between), so the server refused the upgrade: convert the current payload
   * and re-apply this device's pending writes on top. They carry real clocks,
   * so they still beat the ZERO-stamped conversion.
   */
  const rebaseOnLegacy = (
    state: SharedDocState,
    legacy: NonNullable<Awaited<ReturnType<typeof getSharedDoc>>["data"]["legacy"]>,
    legacyHash?: string,
  ) => {
    const base = legacyToDoc(legacy);
    const doc = clone(base);
    mergeDoc(doc, clone(state.pending));
    state.doc = doc;
    state.base = base;
    state.baseOf = legacyHash;
    state.version = 0;
  };

  const sendOnce = async (state: SharedDocState) => {
    const sent = clone(state.pending);
    const base = state.base;
    try {
      const res =
        isEmptyDoc(sent) && !base
          ? await getSharedDoc(state.code, state.version)
          : await syncSharedDoc(state.code, {
              since: state.version,
              changes: sent,
              ...(base ? { base, baseOf: state.baseOf } : {}),
            });
      return { res, sent, base };
    } catch (e: any) {
      const data = e?.response?.data;
      if (e?.response?.status === 409 && data?.error === "base_required" && data.legacy) {
        rebaseOnLegacy(state, data.legacy, data.legacyHash);
        return null; // retry with the fresh base
      }
      throw e;
    }
  };

  const runSync = async (bookId: string) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book?.shareCode) return;
    const state = sharedDocs.value[bookId] ?? (await firstContact(book));
    stage(bookId);

    // A refused upgrade is retried against the payload the server returned; a
    // few attempts cover old clients still writing during the upgrade.
    let attempt: Awaited<ReturnType<typeof sendOnce>> = null;
    for (let i = 0; i < 3 && !attempt; i++) attempt = await sendOnce(state);
    if (!attempt) throw new Error("Shared space upgrade kept conflicting");
    const { res, sent, base } = attempt;
    if (!res.data.doc) throw new Error("Shared space is not upgraded");

    // The book may have been deleted or re-joined while the request was out.
    // Compare raw objects: sharedDocs is reactive, so reading it back yields a
    // proxy that is never === the object firstContact created.
    if (toRaw(sharedDocs.value[bookId]) !== toRaw(state)) return;
    observeDoc(res.data.doc);
    mergeDoc(state.doc, res.data.doc);
    state.version = res.data.version;
    ackPending(state.pending, sent);
    if (base) {
      delete state.base;
      delete state.baseOf;
    }
    applyDoc(bookId);
    await save();
  };

  // Single flight per book: a sync requested while one runs is folded into one
  // follow-up run (so edits made during the request go out right after).
  const inflight = new Map<string, Promise<void>>();
  const rerun = new Set<string>();
  const syncNow = (bookId: string): Promise<void> => {
    const running = inflight.get(bookId);
    if (running) {
      rerun.add(bookId);
      return running;
    }
    const run = runSync(bookId)
      // Never drop the replica on error: its pending writes are the only
      // copy of this device's unsent edits.
      .catch((e: any) => console.error("[sync] Failed to sync shared book:", e))
      .finally(() => {
        inflight.delete(bookId);
        if (rerun.delete(bookId)) void syncNow(bookId);
      });
    inflight.set(bookId, run);
    return run;
  };

  const debouncedSync = debouncePerKey((bookId) => void syncNow(bookId), 300);

  /** After a local mutation: stage it now, send it shortly. */
  const syncSharedBook = (bookId: string) => {
    stage(bookId);
    debouncedSync(bookId);
  };

  /** Push anything pending and pull what others changed. */
  const pullSharedBook = (bookId: string) => syncNow(bookId);

  // One share request per book at a time: a second tap while the first is in
  // flight (a cold start takes seconds) used to create a second shared space,
  // swap the shown code, and orphan the first one.
  const publishing = new Map<string, Promise<string | undefined>>();

  const publishBook = (bookId: string): Promise<string | undefined> => {
    const pendingPublish = publishing.get(bookId);
    if (pendingPublish) return pendingPublish;

    const run = (async () => {
      const book = books.value.find((b) => b.id === bookId);
      if (!book) return undefined;

      // Already shared → just sync and return existing code
      if (book.shareCode) {
        syncSharedBook(bookId);
        return book.shareCode;
      }

      const doc = docFromLocal(book, recordsOf(bookId));
      try {
        const res = await createSharedDoc(doc);
        book.shareCode = res.data.code;
        sharedDocs.value[bookId] = { code: res.data.code, version: res.data.version, doc, pending: emptyDoc() };
        applyDoc(bookId);
        await save();
        return book.shareCode;
      } catch (e) {
        console.error("[sync] Failed to publish book:", e);
        throw e;
      }
    })().finally(() => publishing.delete(bookId));

    publishing.set(bookId, run);
    return run;
  };

  /** Fetches a shared book by code without joining it (for the "who are you?" step). */
  const previewSharedBook = async (code: string): Promise<SharedBookPreview> => {
    const res = await getSharedDoc(code, 0);
    const legacy = res.data.legacy;
    if (legacy && (!legacy.book || !Array.isArray(legacy.book.members) || !Array.isArray(legacy.records))) {
      throw new Error("Malformed shared book payload");
    }
    const doc = legacy ? legacyToDoc(legacy) : res.data.doc;
    const bookId = legacy ? legacy.book.id : String(doc?.book?.f.id ?? "");
    if (!doc?.book || !bookId) throw new Error("Malformed shared book payload");
    const view = materialize(doc, bookId);
    return {
      book: { ...view.book, shareCode: code },
      records: view.records,
      doc,
      version: legacy ? 0 : res.data.version,
      legacy: !!legacy,
      legacyHash: res.data.legacyHash,
    };
  };

  /** The member of `book` already linked to this device's user, if any. */
  const findSelfMember = (book: Pick<Book, "members">) =>
    book.members.find((m) => isSelf(m, userProfile.value));

  /**
   * Joins a previewed shared book. Joining never adds a member: the joiner
   * either claims an existing, unlinked member (`claimMemberId`) — linking it
   * to their public memberId — or joins without one (null) and can still view
   * and record for others. Already-linked joiners keep their member.
   */
  const joinSharedBook = async (
    code: string,
    preview: SharedBookPreview,
    claimMemberId: string | null
  ) => {
    try {
      const existing = books.value.find((b) => b.id === preview.book.id);
      if (existing) {
        if (!confirm(i18n.global.t("books.joinOverwriteConfirm", { name: existing.name }))) return;
        records.value = records.value.filter((r) => r.bookId !== existing.id);
        books.value = books.value.filter((b) => b.id !== existing.id);
      }

      const doc = clone(preview.doc);
      observeDoc(doc);
      sharedDocs.value[preview.book.id] = {
        code,
        version: preview.version,
        doc,
        pending: emptyDoc(),
        ...(preview.legacy ? { base: clone(doc), baseOf: preview.legacyHash } : {}),
      };
      const newBook: Book = { ...preview.book, shareCode: code, isSynced: true };
      books.value.push(newBook);
      records.value.push(...preview.records.map((r) => ({ ...r, isSynced: true })));

      if (!findSelfMember(newBook) && claimMemberId) {
        const claimed = newBook.members.find((m) => m.id === claimMemberId && !m.userId && !m.archived);
        // Use the public memberId (never the secret backup id).
        if (claimed) claimed.userId = userProfile.value.memberId;
      }
      // Staged before anything can pull: the claim is a newer register than
      // the server's, so a concurrent pull can no longer undo it.
      stage(newBook.id);
      currentBookId.value = newBook.id;
      await save();

      // Push the claim (and, for a v1 space, the upgrade) right away.
      const state = sharedDocs.value[newBook.id];
      if (!isEmptyDoc(state.pending) || state.base) await syncNow(newBook.id);

      return books.value.find((b) => b.id === newBook.id) ?? newBook;
    } catch (e) {
      console.error("[sync] Failed to join book:", e);
      throw e;
    }
  };

  // =====================
  //  Book CRUD
  // =====================

  /** Members from editor drafts: trimmed, blank rows dropped, ids kept. */
  const toMembers = (drafts: MemberDraft[], existing: Member[] = []): Member[] => {
    const byId = new Map(existing.map((m) => [m.id, m]));
    return drafts
      .map((d) => ({ ...d, name: d.name.trim() }))
      .filter((d) => d.name)
      .map((d) => {
        const current = byId.get(d.id);
        // Known id → rename (keeps userId); otherwise a new member with the
        // draft's pre-generated id.
        // A draft may also claim an unlinked member as the user ("this is me").
        if (current) {
          const claimed = !current.userId && d.userId ? { userId: d.userId } : {};
          return { ...current, name: d.name, ...claimed };
        }
        const m: Member = { id: d.id, name: d.name };
        if (d.userId) m.userId = d.userId;
        return m;
      });
  };

  const createBook = async (name: string, drafts: MemberDraft[], currency: CurrencyCode) => {
    if (!name.trim()) return null;
    const book: Book = {
      id: crypto.randomUUID(),
      name: name.trim(),
      members: toMembers(drafts),
      currency,
      createdAt: new Date().toISOString(),
      isSynced: false,
    };
    books.value.push(book);
    currentBookId.value = book.id;
    await save();
    return book;
  };

  const selectBook = async (bookId: string) => {
    currentBookId.value = bookId;
    await save();
    // Background pull if shared
    pullSharedBook(bookId);
  };

  /** Local (unshared) book: drop removed members and repoint what referenced them. */
  const removeMembersLocally = (bookId: string, removed: Member[], kept: Member[]) => {
    if (!removed.length) return;
    const keptIds = kept.map((m) => m.id);
    const fallbackId = keptIds[0] || "";
    pendingDeleteMemberIds.value.push(...removed.map((m) => m.id));
    // The editor blocks removing a member any record involves; this only
    // catches legacy data.
    records.value.filter((r) => r.bookId === bookId).forEach((r) => {
      let changed = false;
      // Income records have no payer (""); leave them alone.
      if (r.paidById && !keptIds.includes(r.paidById)) {
        r.paidById = fallbackId;
        changed = true;
      }
      if (!r.splitAmongIds.includes("all")) {
        const filtered = r.splitAmongIds.filter((id) => keptIds.includes(id));
        if (filtered.length !== r.splitAmongIds.length) {
          r.splitAmongIds = filtered.length > 0 ? filtered : fallbackId ? [fallbackId] : [];
          changed = true;
        }
      }
      if (r.splitCustomAmounts) {
        const gone = Object.keys(r.splitCustomAmounts).filter((id) => !keptIds.includes(id));
        if (gone.length) {
          gone.forEach((id) => delete r.splitCustomAmounts![id]);
          changed = true;
        }
      }
      if (changed) r.isSynced = false;
    });
  };

  const updateBook = async (
    bookId: string,
    name: string,
    drafts: MemberDraft[],
    currency?: CurrencyCode
  ) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book || !name.trim()) return null;

    const existingMembers = book.members;
    const newMembers = toMembers(drafts, existingMembers);
    if (newMembers.length === 0) return null;

    const newMemberIds = newMembers.map((m) => m.id);
    const removed = existingMembers.filter((m) => !newMemberIds.includes(m.id));

    if (book.shareCode) {
      // Shared: a removed member is archived, never dropped — another device
      // may have added a record they're in, and the CRDT can't delete. Records
      // are left alone (no rewriting history onto someone else).
      newMembers.push(...removed.map((m) => ({ ...m, archived: true })));
    } else {
      removeMembersLocally(bookId, removed, newMembers);
    }

    book.name = name.trim();
    book.members = newMembers;
    // The currency is locked once the book has records: their amounts are in it.
    if (currency && !records.value.some((r) => r.bookId === bookId)) {
      book.currency = currency;
    }
    book.isSynced = false;
    await save();
    syncSharedBook(bookId);
    return book;
  };

  const deleteBook = async (bookId: string) => {
    // Add book and its records to tombstones
    pendingDeleteBookIds.value.push(bookId);
    const bookRecordIds = records.value.filter((r) => r.bookId === bookId).map((r) => r.id);
    pendingDeleteRecordIds.value.push(...bookRecordIds);

    // Leaving a shared book locally must not delete its records for everyone:
    // drop the replica without staging anything.
    delete sharedDocs.value[bookId];
    books.value = books.value.filter((b) => b.id !== bookId);
    records.value = records.value.filter((r) => r.bookId !== bookId);
    if (currentBookId.value === bookId) {
      currentBookId.value = books.value[0]?.id ?? null;
    }
    await save();
  };

  // =====================
  //  Book Record CRUD
  // =====================

  const addRecord = async (record: Omit<RecordItem, "id" | "bookId">) => {
    if (!currentBookId.value) return;
    records.value.unshift({
      ...record,
      id: crypto.randomUUID(),
      bookId: currentBookId.value,
      isSynced: false,
    });
    await save();
    syncSharedBook(currentBookId.value);
  };

  const updateRecord = async (id: string, record: Partial<Omit<RecordItem, "id" | "bookId">>) => {
    const idx = records.value.findIndex((r) => r.id === id);
    if (idx !== -1) {
      const bookId = records.value[idx].bookId;
      records.value[idx] = { ...records.value[idx], ...record, isSynced: false };
      await save();
      syncSharedBook(bookId);
    }
  };

  const deleteRecord = async (id: string) => {
    const record = records.value.find((r) => r.id === id);
    if (record) {
      pendingDeleteRecordIds.value.push(id);
      records.value = records.value.filter((r) => r.id !== id);
      await save();
      syncSharedBook(record.bookId);
    }
  };

  // =====================
  //  Summaries & Settlement
  // =====================

  const totalExpense = computed(() =>
    currentBookRecords.value.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0)
  );
  const totalIncome = computed(() =>
    currentBookRecords.value.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0)
  );
  const balance = computed(() => totalIncome.value - totalExpense.value);

  const memberStats = computed(() =>
    currentBook.value
      ? calcMemberStats(currentBook.value.members, currentBookRecords.value, currentBookCurrency.value)
      : []
  );

  const settlements = computed((): Settlement[] =>
    currentBook.value ? calcSettlements(memberStats.value) : []
  );

  const getMemberCategoryBreakdown = (memberId: string): MemberCategoryBreakdown[] => {
    if (!currentBook.value) return [];
    const allMemberIds = currentBook.value.members.map((m) => m.id);
    return calcMemberCategoryBreakdown(
      currentBookRecords.value,
      allMemberIds,
      memberId,
      decimalsOf(currentBookCurrency.value)
    );
  };

  return {
    currentBook,
    currentBookRecords,
    currentBookCurrency,
    createBook,
    selectBook,
    updateBook,
    deleteBook,
    addRecord,
    updateRecord,
    deleteRecord,
    totalExpense,
    totalIncome,
    balance,
    memberStats,
    settlements,
    getMemberCategoryBreakdown,
    publishBook,
    previewSharedBook,
    joinSharedBook,
    findSelfMember,
    syncSharedBook,
    pullSharedBook,
  };
}
