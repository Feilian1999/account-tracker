import type { Ref } from "vue";
import { computed, watch } from "vue";
import type { Book, RecordItem, Member, Settlement, UserProfile, SharedBookPayload } from "./types";
import { shareBookToCloud, fetchSharedBook, updateSharedBook } from "../utils/api";
import { calcMemberCategoryBreakdown, type MemberCategoryBreakdown } from "../utils/memberBreakdown";
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
    const bookSig = book.name + "|" + book.members.map((m) => m.id).join(",");
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
        const nowSig = stillBook.name + "|" + stillBook.members.map((m) => m.id).join(",");
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

  const publishBook = async (bookId: string) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book) return;

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
  };

  const joinBookByCode = async (code: string) => {
    try {
      const res = await fetchSharedBook(code);
      const data = res.data as SharedBookPayload;

      const existing = books.value.find((b) => b.id === data.book.id);
      if (existing) {
        if (!confirm(i18n.global.t("books.joinOverwriteConfirm", { name: existing.name }))) return;
        records.value = records.value.filter((r) => r.bookId !== existing.id);
        books.value = books.value.filter((b) => b.id !== existing.id);
      }

      const newBook: Book = { ...data.book, shareCode: code, isSynced: true };

      // Auto-enroll the joining user as a member, using the public memberId.
      const myId = userProfile.value.memberId;
      const legacyId = userProfile.value.id; // pre-decoupling, membership used the backup id
      const myName = userProfile.value.name || "我";

      // Check if I am already in the member list (by new memberId or legacy id).
      const existingMemberByUserId = newBook.members.find(
        (m: Member) => m.userId === myId || (!!legacyId && m.userId === legacyId)
      );

      let shouldSyncBack = false;
      if (!existingMemberByUserId) {
        // If not found by userId, try to match by name (case-insensitive)
        const existingMemberByName = newBook.members.find(
          (m: Member) => !m.userId && m.name.trim().toLowerCase() === myName.trim().toLowerCase()
        );

        if (existingMemberByName) {
          // Link my memberId to the existing placeholder member
          existingMemberByName.userId = myId;
        } else {
          // If no matching name found, add me as a NEW member
          newBook.members.push({
            id: crypto.randomUUID(),
            name: myName,
            userId: myId
          });
        }
        shouldSyncBack = true;
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

  const createBook = async (name: string, memberNames: string[]) => {
    if (!name.trim()) return null;
    const members: Member[] = memberNames
      .filter((n) => n.trim())
      .map((n, i) => {
        const m: Member = { id: crypto.randomUUID(), name: n.trim() };
        // Assume the first member added is the current user if they are creating it.
        // Use the public memberId (never the secret backup id).
        if (i === 0 && userProfile.value.memberId) {
          m.userId = userProfile.value.memberId;
        }
        return m;
      });

    const book: Book = {
      id: crypto.randomUUID(),
      name,
      members,
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

  const updateBook = async (bookId: string, name: string, memberNames: string[]) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book || !name.trim()) return null;

    const existingMembers = book.members;
    const trimmedNames = memberNames.map((n) => n.trim()).filter(Boolean);

    // First pass: exact name matches keep their identity (id + userId).
    const usedExisting = new Set<string>();
    const matched: (Member | null)[] = trimmedNames.map((name) => {
      const found = existingMembers.find((m) => !usedExisting.has(m.id) && m.name === name);
      if (found) {
        usedExisting.add(found.id);
        return found;
      }
      return null;
    });

    // Second pass: pair each still-unmatched name with a leftover existing member
    // (in order) and treat it as a RENAME — preserving the id keeps all historical
    // paidBy/split references intact instead of reassigning them to member #0.
    const leftoverExisting = existingMembers.filter((m) => !usedExisting.has(m.id));
    let li = 0;
    const newMembers: Member[] = matched.map((m, idx) => {
      if (m) return m;
      const name = trimmedNames[idx];
      if (li < leftoverExisting.length) {
        const renamed: Member = { ...leftoverExisting[li], name };
        li++;
        return renamed;
      }
      return { id: crypto.randomUUID(), name };
    });

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
      if (!newMemberIds.includes(r.paidById)) {
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

  const memberStats = computed(() => {
    if (!currentBook.value) return [];

    const members = currentBook.value.members;
    const allMemberIds = members.map((m) => m.id);

    // Accumulate in integer cents so per-record shares sum EXACTLY to the amount
    // and every member's net cancels out (independent rounding did not).
    const paidCents: Record<string, number> = {};
    const owedCents: Record<string, number> = {};
    members.forEach((m) => {
      paidCents[m.id] = 0;
      owedCents[m.id] = 0;
    });

    currentBookRecords.value.forEach((r) => {
      if (r.type !== "expense") return;

      const amountCents = Math.round(r.amount * 100);
      if (paidCents[r.paidById] !== undefined) {
        paidCents[r.paidById] += amountCents;
      }

      if (r.splitCustomAmounts) {
        // Custom split amounts
        Object.entries(r.splitCustomAmounts).forEach(([memberId, amount]) => {
          if (owedCents[memberId] !== undefined) {
            owedCents[memberId] += Math.round(amount * 100);
          }
        });
      } else {
        // Equal split — distribute cents with remainder to the first members so
        // the shares sum exactly to the record amount.
        const splitIds = (r.splitAmongIds.includes("all") ? allMemberIds : r.splitAmongIds)
          .filter((id) => owedCents[id] !== undefined);
        const n = splitIds.length;
        if (n > 0) {
          const base = Math.floor(amountCents / n);
          let extra = amountCents - base * n;
          splitIds.forEach((id) => {
            let c = base;
            if (extra > 0) {
              c += 1;
              extra--;
            }
            owedCents[id] += c;
          });
        }
      }
    });

    return members.map((member) => {
      const paid = paidCents[member.id] || 0;
      const owed = owedCents[member.id] || 0;
      return {
        member,
        paid: paid / 100,
        owed: owed / 100,
        net: (paid - owed) / 100,
      };
    });
  });

  const settlements = computed((): Settlement[] => {
    if (!currentBook.value) return [];
    const balances = memberStats.value.map((s) => ({ member: s.member, net: s.net }));
    const creditors = balances.filter((b) => b.net > 0).sort((a, b) => b.net - a.net);
    const debtors = balances.filter((b) => b.net < 0).sort((a, b) => a.net - b.net);
    const result: Settlement[] = [];
    let ci = 0, di = 0;
    // Use a sub-cent epsilon for comparisons so floating-point residue does not
    // leave phantom debts/credits that never clear.
    const EPS = 0.005;
    while (ci < creditors.length && di < debtors.length) {
      const credit = creditors[ci], debt = debtors[di];
      const amount = Math.min(credit.net, -debt.net);
      if (amount > EPS) {
        result.push({ from: debt.member, to: credit.member, amount: Math.round(amount * 100) / 100 });
      }
      credit.net -= amount;
      debt.net += amount;
      if (credit.net <= EPS) ci++;
      if (debt.net >= -EPS) di++;
    }
    return result;
  });

  const getMemberCategoryBreakdown = (memberId: string): MemberCategoryBreakdown[] => {
    if (!currentBook.value) return [];
    const allMemberIds = currentBook.value.members.map((m) => m.id);
    return calcMemberCategoryBreakdown(currentBookRecords.value, allMemberIds, memberId);
  };

  return {
    currentBook,
    currentBookRecords,
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
    joinBookByCode,
    syncSharedBook,
    pullSharedBook,
  };
}
