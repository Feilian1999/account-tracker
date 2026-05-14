import type { Ref } from "vue";
import { computed, watch } from "vue";
import type { Book, RecordItem, Member, Settlement, UserProfile, SharedBookPayload } from "./types";
import { shareBookToCloud, fetchSharedBook, updateSharedBook } from "../utils/api";
import { calcMemberCategoryBreakdown } from "../utils/memberBreakdown";

// ---- Debounce helper ----
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
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

    const bookRecords = records.value.filter((r) => r.bookId === bookId);
    const payload: SharedBookPayload = { book, records: bookRecords };

    try {
      await updateSharedBook(book.shareCode, payload);
      // Mark records for this shared book as synced
      records.value.filter((r) => r.bookId === bookId).forEach((r) => {
        r.isSynced = true;
      });
      await save();
    } catch (e) {
      console.error("[sync] Failed to sync shared book:", e);
    }
  };

  // Debounced version prevents rapid-fire API calls during batch operations
  const syncSharedBook = debounce(_syncSharedBookImmediate, 300);

  const pullSharedBook = async (bookId: string) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book || !book.shareCode) return;
    try {
      const res = await fetchSharedBook(book.shareCode);
      const data = res.data as SharedBookPayload;

      book.name = data.book.name;
      book.members = data.book.members;

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
        if (!confirm(`您已經有「${existing.name}」這個帳本了，要用雲端的資料覆蓋本地嗎？`)) return;
        records.value = records.value.filter((r) => r.bookId !== existing.id);
        books.value = books.value.filter((b) => b.id !== existing.id);
      }

      const newBook: Book = { ...data.book, shareCode: code, isSynced: true };

      // Auto-enroll the joining user as a member
      const myId = userProfile.value.id;
      const myName = userProfile.value.name || "我";

      // Check if I am already in the member list by userId
      const existingMemberByUserId = newBook.members.find((m: Member) => m.userId === myId);

      let shouldSyncBack = false;
      if (!existingMemberByUserId) {
        // If not found by userId, try to match by name (case-insensitive)
        const existingMemberByName = newBook.members.find(
          (m: Member) => !m.userId && m.name.trim().toLowerCase() === myName.trim().toLowerCase()
        );

        if (existingMemberByName) {
          // Link my userId to the existing placeholder member
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
        // Assume the first member added is the current user if they are creating it
        if (i === 0 && userProfile.value.id) {
          m.userId = userProfile.value.id;
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
    const newMembers: Member[] = memberNames
      .filter((n) => n.trim())
      .map((n) => {
        const trimmed = n.trim();
        const existing = existingMembers.find((m) => m.name === trimmed);
        return existing ? existing : { id: crypto.randomUUID(), name: trimmed };
      });

    const newMemberIds = newMembers.map((m) => m.id);
    const fallbackId = newMembers[0]?.id || "";

    // Adjust records to prevent orphaned member references
    records.value.filter((r) => r.bookId === bookId).forEach((r) => {
      if (!newMemberIds.includes(r.paidById)) {
        r.paidById = fallbackId;
      }
      if (!r.splitAmongIds.includes("all")) {
        r.splitAmongIds = r.splitAmongIds.filter((id) => newMemberIds.includes(id));
        if (r.splitAmongIds.length === 0 && fallbackId) {
          r.splitAmongIds = [fallbackId];
        }
      }
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

    // Initialize maps for faster accumulation
    const paidMap: Record<string, number> = {};
    const owedMap: Record<string, number> = {};
    members.forEach(m => {
      paidMap[m.id] = 0;
      owedMap[m.id] = 0;
    });

    currentBookRecords.value.forEach(r => {
      if (r.type !== "expense") return;

      // Add to paid amount
      if (paidMap[r.paidById] !== undefined) {
        paidMap[r.paidById] += r.amount;
      }

      // Calculate and distribute owed amount
      const splitIds = r.splitAmongIds.includes("all") ? allMemberIds : r.splitAmongIds;
      if (r.splitCustomAmounts) {
        // Handle custom split amounts
        Object.entries(r.splitCustomAmounts).forEach(([memberId, amount]) => {
          if (owedMap[memberId] !== undefined) {
            owedMap[memberId] += amount;
          }
        });
      } else if (splitIds.length > 0) {
        // Handle equal split
        const share = r.amount / splitIds.length;
        splitIds.forEach(id => {
          if (owedMap[id] !== undefined) {
            owedMap[id] += share;
          }
        });
      }
    });

    return members.map(member => {
      const paid = paidMap[member.id] || 0;
      const owed = owedMap[member.id] || 0;
      return {
        member,
        paid: Math.round(paid),
        owed: Math.round(owed),
        net: Math.round(paid - owed),
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
    while (ci < creditors.length && di < debtors.length) {
      const credit = creditors[ci], debt = debtors[di];
      const amount = Math.min(credit.net, -debt.net);
      if (amount > 0) result.push({ from: debt.member, to: credit.member, amount });
      credit.net -= amount;
      debt.net += amount;
      if (credit.net === 0) ci++;
      if (debt.net === 0) di++;
    }
    return result;
  });

  const getMemberCategoryBreakdown = (memberId: string) => {
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
