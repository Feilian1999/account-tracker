import type { Ref } from "vue";
import { computed, watch } from "vue";
import type { Book, CurrencyCode, RecordItem, Member, Settlement, UserProfile, SharedBookPayload } from "./types";
import { shareBookToCloud, fetchSharedBook, updateSharedBook } from "../utils/api";
import { calcMemberCategoryBreakdown, type MemberCategoryBreakdown } from "../utils/memberBreakdown";
import { calcMemberStats, calcSettlements } from "../utils/settlement";
import { currencyOf, decimalsOf } from "../utils/currency";
import { isSelf, type MemberDraft } from "../utils/member";
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

const bookSignature = (book: Book) =>
  [book.name, book.currency ?? "", book.members.map((m) => m.id).join(",")].join("|");

/**
 * Book CRUD, settlement, and shared-book sync actions.
 */
export function setupBookActions(
  books: Ref<Book[]>,
  records: Ref<RecordItem[]>,
  currentBookId: Ref<string | null>,
  userProfile: Ref<UserProfile>,
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
  //  Shared Book Sync
  // =====================

  const _syncSharedBookImmediate = async (bookId: string) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book || !book.shareCode) return;

    // Snapshot exactly what we push. Records edited/added during the await are
    // replaced by new objects (updateRecord) or absent (addRecord), so they will
    // not be in this array and must stay unsynced.
    const pushedRecords = records.value.filter((r) => r.bookId === bookId);
    // Deleted record ids to propagate to the shared space so the backend can
    // remove them from the merged payload (ids are globally unique, safe to send).
    const deletedIds = [...pendingDeleteRecordIds.value];
    // Removed member ids to propagate, so the backend's union-by-id merge
    // (which otherwise never drops a member) actually deletes them.
    const deletedMemberIds = [...pendingDeleteMemberIds.value];
    // Signature of the book fields we push, to detect in-flight edits.
    const bookSig = bookSignature(book);
    const payload = { book, records: pushedRecords, deletedIds, deletedMemberIds } as SharedBookPayload & {
      deletedIds: string[];
      deletedMemberIds: string[];
    };

    try {
      await updateSharedBook(book.shareCode, payload);

      pushedRecords.forEach((r) => { r.isSynced = true; });

      // Only mark the book synced if it wasn't edited during the round trip.
      const stillBook = books.value.find((b) => b.id === bookId);
      if (stillBook) {
        const nowSig = bookSignature(stillBook);
        if (nowSig === bookSig) stillBook.isSynced = true;
      }

      // These deletions are now propagated; drop their tombstones so they don't
      // accumulate forever or re-delete resurrected records.
      if (deletedIds.length) {
        const sent = new Set(deletedIds);
        pendingDeleteRecordIds.value = pendingDeleteRecordIds.value.filter((id) => !sent.has(id));
      }
      if (deletedMemberIds.length) {
        const sentM = new Set(deletedMemberIds);
        pendingDeleteMemberIds.value = pendingDeleteMemberIds.value.filter((id) => !sentM.has(id));
      }

      await save();
    } catch (e) {
      console.error("[sync] Failed to sync shared book:", e);
    }
  };

  // Debounced version prevents rapid-fire API calls during batch operations
  const syncSharedBook = debouncePerKey(_syncSharedBookImmediate, 300);

  const pullSharedBook = async (bookId: string) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book || !book.shareCode) return;
    try {
      const res = await fetchSharedBook(book.shareCode);
      const data = res.data as SharedBookPayload;

      // Validate shape before trusting the payload (unauthenticated endpoint).
      if (!data || !data.book || !Array.isArray(data.book.members) || !Array.isArray(data.records)) {
        console.warn("[sync] Ignoring malformed shared book payload");
        return;
      }

      // Never resurrect a member this device has deleted but not yet finished
      // pushing (the backend union-merges members and won't drop it on its own
      // until our deletedMemberIds reaches it).
      const pendingDeleteMemberSet = new Set(pendingDeleteMemberIds.value);

      // Only adopt cloud book fields when we have no pending local book edit,
      // otherwise a pull would revert a rename / member change awaiting push.
      if (book.isSynced !== false) {
        book.name = data.book.name;
        // Books shared before multi-currency support have no currency in the cloud.
        if (data.book.currency) book.currency = data.book.currency;
        book.members = data.book.members.filter((m) => !pendingDeleteMemberSet.has(m.id));
      } else {
        // A pending local book edit must not be reverted — but still adopt cloud
        // members we don't have yet, because the cloud records merged in below may
        // be paidBy/split among them. A record referencing an unknown member id
        // breaks settlement and hard-fails the whole UUID backup (records.paid_by_id
        // is an FK to book_members). The shared-book PUT unions members anyway, so
        // this matches the backend's merge semantics.
        const localMemberIds = new Set(book.members.map((m) => m.id));
        const unknown = data.book.members.filter(
          (m) => !localMemberIds.has(m.id) && !pendingDeleteMemberSet.has(m.id)
        );
        if (unknown.length) book.members = [...book.members, ...unknown];
      }

      // Smart merge for shared book records
      const cloudRecords: RecordItem[] = data.records.map((r) => ({ ...r, isSynced: true }));
      const localPendingForBook = records.value.filter(
        (r) => r.bookId === bookId && !r.isSynced
      );
      const pendingDeleteSet = new Set(pendingDeleteRecordIds.value);

      // Filter tombstoned records from cloud
      const cloudFiltered = cloudRecords.filter((r) => !pendingDeleteSet.has(r.id));

      // Local pending overrides cloud version of same ID
      const localPendingById = new Map(localPendingForBook.map((r) => [r.id, r]));
      const cloudMerged = cloudFiltered.map((r) => localPendingById.get(r.id) ?? r);

      // Keep local pending records not present in cloud
      const cloudIds = new Set(cloudFiltered.map((r) => r.id));
      const extraLocal = localPendingForBook.filter((r) => !cloudIds.has(r.id));

      records.value = [
        ...records.value.filter((r) => r.bookId !== bookId),
        ...cloudMerged,
        ...extraLocal,
      ];
      await save();
    } catch (e) {
      console.error("[sync] Failed to pull shared book:", e);
    }
  };

  // One share request per book at a time: a second tap while the first is in
  // flight (a cold start takes seconds) used to create a second shared space,
  // swap the shown code, and orphan the first one.
  const publishing = new Map<string, Promise<string | undefined>>();

  const publishBook = (bookId: string): Promise<string | undefined> => {
    const inflight = publishing.get(bookId);
    if (inflight) return inflight;

    const run = (async () => {
      const book = books.value.find((b) => b.id === bookId);
      if (!book) return undefined;

      // Already shared → just sync and return existing code
      if (book.shareCode) {
        syncSharedBook(bookId);
        return book.shareCode;
      }

      const bookRecords = records.value.filter((r) => r.bookId === bookId);
      const payload: SharedBookPayload = { book, records: bookRecords };

      try {
        const res = await shareBookToCloud(payload);
        book.shareCode = res.data.code;
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
  const previewSharedBook = async (code: string): Promise<SharedBookPayload> => {
    const res = await fetchSharedBook(code);
    const data = res.data as SharedBookPayload;
    if (!data || !data.book || !Array.isArray(data.book.members) || !Array.isArray(data.records)) {
      throw new Error("Malformed shared book payload");
    }
    return data;
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
    data: SharedBookPayload,
    claimMemberId: string | null
  ) => {
    try {
      const existing = books.value.find((b) => b.id === data.book.id);
      if (existing) {
        if (!confirm(i18n.global.t("books.joinOverwriteConfirm", { name: existing.name }))) return;
        records.value = records.value.filter((r) => r.bookId !== existing.id);
        books.value = books.value.filter((b) => b.id !== existing.id);
      }

      const newBook: Book = {
        ...data.book,
        members: data.book.members.map((m) => ({ ...m })),
        shareCode: code,
        isSynced: true,
      };

      let shouldSyncBack = false;
      if (!findSelfMember(newBook) && claimMemberId) {
        const claimed = newBook.members.find((m) => m.id === claimMemberId && !m.userId);
        if (claimed) {
          // Use the public memberId (never the secret backup id).
          claimed.userId = userProfile.value.memberId;
          // A pending local book edit: setting currentBookId below fires the
          // auto-pull watcher, which would otherwise adopt the cloud member list
          // (still unclaimed) during the save() await and drop the link before
          // it is pushed. The push marks the book synced again.
          newBook.isSynced = false;
          shouldSyncBack = true;
        }
      }

      books.value.push(newBook);
      records.value.push(...data.records.map((r) => ({ ...r, isSynced: true })));
      currentBookId.value = newBook.id;
      await save();

      if (shouldSyncBack) {
        // Critical: Must sync back IMMEDIATELY and AWAIT it.
        // Otherwise, subsequent pull (triggered by selectBook) will overwrite local changes.
        await _syncSharedBookImmediate(newBook.id);
      }

      return newBook;
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
    const fallbackId = newMembers[0]?.id || "";

    // Tombstone genuinely removed members so a pull/merge can't resurrect them —
    // the backend's shared-book merge unions members by id and never drops one
    // on its own; see pullSharedBook and _syncSharedBookImmediate.
    const removedMemberIds = existingMembers
      .filter((m) => !newMemberIds.includes(m.id))
      .map((m) => m.id);
    if (removedMemberIds.length) pendingDeleteMemberIds.value.push(...removedMemberIds);

    // Adjust only records that still reference a genuinely removed member.
    records.value.filter((r) => r.bookId === bookId).forEach((r) => {
      let changed = false;
      // Income records have no payer (""); leave them alone.
      if (r.paidById && !newMemberIds.includes(r.paidById)) {
        r.paidById = fallbackId;
        changed = true;
      }
      if (!r.splitAmongIds.includes("all")) {
        const filtered = r.splitAmongIds.filter((id) => newMemberIds.includes(id));
        if (filtered.length !== r.splitAmongIds.length) {
          r.splitAmongIds = filtered.length > 0 ? filtered : fallbackId ? [fallbackId] : [];
          changed = true;
        }
      }
      if (r.splitCustomAmounts) {
        const removed = Object.keys(r.splitCustomAmounts).filter((id) => !newMemberIds.includes(id));
        if (removed.length) {
          removed.forEach((id) => delete r.splitCustomAmounts![id]);
          changed = true;
        }
      }
      if (changed) r.isSynced = false;
    });

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

    books.value = books.value.filter((b) => b.id !== bookId);
    records.value = records.value.filter((r) => r.bookId !== bookId);
    if (currentBookId.value === bookId) {
      currentBookId.value = books.value[0]?.id ?? null;
    }
    await save();
  };

  const addMemberToBook = async (bookId: string, memberName: string) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book || !memberName.trim()) return;
    book.members.push({ id: crypto.randomUUID(), name: memberName.trim() });
    book.isSynced = false;
    await save();
    syncSharedBook(bookId);
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
    addMemberToBook,
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
