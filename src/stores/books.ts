import type { Ref } from "vue";
import { computed } from "vue";
import type { Book, RecordItem, Member, Settlement, UserProfile, SharedBookPayload } from "./types";
import { shareBookToCloud, fetchSharedBook, updateSharedBook } from "../utils/api";

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
  save: () => void
) {
  // ---- Computed ----
  const currentBook = computed(
    () => books.value.find((b) => b.id === currentBookId.value) ?? null
  );

  const currentBookRecords = computed(() =>
    records.value.filter((r) => r.bookId === currentBookId.value)
  );

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

      records.value = [
        ...records.value.filter((r) => r.bookId !== bookId),
        ...data.records,
      ];
      save();
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
      save();
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

      const newBook: Book = { ...data.book, shareCode: code };

      // Auto-enroll the joining user as a member
      const myName = userProfile.value.name || "我";
      const amIMember = newBook.members.some((m: Member) => m.name === myName);
      let shouldSyncBack = false;
      if (!amIMember) {
        newBook.members = [...newBook.members, { id: crypto.randomUUID(), name: myName }];
        shouldSyncBack = true;
      }

      books.value.push(newBook);
      records.value.push(...data.records);
      currentBookId.value = newBook.id;
      save();

      if (shouldSyncBack) {
        syncSharedBook(newBook.id);
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

  const createBook = (name: string, memberNames: string[]) => {
    if (!name.trim()) return null;
    const members: Member[] = memberNames
      .filter((n) => n.trim())
      .map((n) => ({ id: crypto.randomUUID(), name: n.trim() }));

    const book: Book = {
      id: crypto.randomUUID(),
      name,
      members,
      createdAt: new Date().toISOString(),
    };
    books.value.push(book);
    currentBookId.value = book.id;
    save();
    return book;
  };

  const selectBook = (bookId: string) => {
    currentBookId.value = bookId;
    save();
  };

  const updateBook = (bookId: string, name: string, memberNames: string[]) => {
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
    save();
    syncSharedBook(bookId);
    return book;
  };

  const deleteBook = (bookId: string) => {
    books.value = books.value.filter((b) => b.id !== bookId);
    records.value = records.value.filter((r) => r.bookId !== bookId);
    if (currentBookId.value === bookId) {
      currentBookId.value = books.value[0]?.id ?? null;
    }
    save();
  };

  const addMemberToBook = (bookId: string, memberName: string) => {
    const book = books.value.find((b) => b.id === bookId);
    if (!book || !memberName.trim()) return;
    book.members.push({ id: crypto.randomUUID(), name: memberName.trim() });
    save();
    syncSharedBook(bookId);
  };

  // =====================
  //  Book Record CRUD
  // =====================

  const addRecord = (record: Omit<RecordItem, "id" | "bookId">) => {
    if (!currentBookId.value) return;
    records.value.unshift({
      ...record,
      id: crypto.randomUUID(),
      bookId: currentBookId.value,
    });
    save();
    syncSharedBook(currentBookId.value);
  };

  const updateRecord = (id: string, record: Partial<Omit<RecordItem, "id" | "bookId">>) => {
    const idx = records.value.findIndex((r) => r.id === id);
    if (idx !== -1) {
      const bookId = records.value[idx].bookId;
      records.value[idx] = { ...records.value[idx], ...record };
      save();
      syncSharedBook(bookId);
    }
  };

  const deleteRecord = (id: string) => {
    const record = records.value.find((r) => r.id === id);
    if (record) {
      records.value = records.value.filter((r) => r.id !== id);
      save();
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
    const allMemberIds = currentBook.value.members.map((m) => m.id);
    return currentBook.value.members.map((member) => {
      const paid = currentBookRecords.value
        .filter((r) => r.type === "expense" && r.paidById === member.id)
        .reduce((s, r) => s + r.amount, 0);
      const owed = currentBookRecords.value
        .filter((r) => {
          if (r.type !== "expense") return false;
          const splitIds = r.splitAmongIds.includes("all") ? allMemberIds : r.splitAmongIds;
          return splitIds.includes(member.id);
        })
        .reduce((s, r) => {
          const splitIds = r.splitAmongIds.includes("all") ? allMemberIds : r.splitAmongIds;
          return s + r.amount / splitIds.length;
        }, 0);
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
    publishBook,
    joinBookByCode,
    syncSharedBook,
    pullSharedBook,
  };
}
