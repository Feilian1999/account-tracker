import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { pushSyncData, pullSyncData } from "../utils/api";

// ============================
// Data Models
// ============================

export interface Member {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
}

export interface RecordItem {
  id: string;
  bookId: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  date: string;
  note: string;
  paidById: string;
  splitAmongIds: string[];
}

/** Personal record - not tied to a shared book */
export interface PersonalRecord {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  date: string;
  note: string;
  sourceBookId?: string; // set when imported from a shared book
}

export interface RecordTemplate {
  id: string;
  name: string;
  type: "expense" | "income";
  amount: number | null; // null if amount isn't pre-filled
  category: string;
  note: string;
}

// User & Settings
export interface UserProfile {
  name: string;
  avatar?: string;
  email?: string;
  theme: "light" | "dark" | "system";
  animations: boolean;
  isLoggedIn: boolean;
  authToken?: string;
}

export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface Settlement {
  from: Member;
  to: Member;
  amount: number;
}

// ============================
// Helpers
// ============================

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    console.warn(`[storage] Failed to read key "${key}", using fallback.`);
    return fallback;
  }
}

function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[storage] Failed to save key "${key}":`, e);
  }
}

// ============================
// Store
// ============================

export const defaultCategories: Category[] = [
  {
    id: "e1",
    name: "飲食",
    type: "expense",
    icon: "restaurant",
    color: "blue",
    isDefault: true,
  },
  {
    id: "e2",
    name: "交通",
    type: "expense",
    icon: "directions_car",
    color: "green",
    isDefault: true,
  },
  {
    id: "e3",
    name: "購物",
    type: "expense",
    icon: "shopping_bag",
    color: "purple",
    isDefault: true,
  },
  {
    id: "e4",
    name: "娛樂",
    type: "expense",
    icon: "sports_esports",
    color: "red",
    isDefault: true,
  },
  {
    id: "e5",
    name: "住宿",
    type: "expense",
    icon: "hotel",
    color: "indigo",
    isDefault: true,
  },
  {
    id: "e6",
    name: "景點",
    type: "expense",
    icon: "attractions",
    color: "pink",
    isDefault: true,
  },
  {
    id: "e7",
    name: "繳費",
    type: "expense",
    icon: "receipt_long",
    color: "gray",
    isDefault: true,
  },
  {
    id: "e8",
    name: "其他",
    type: "expense",
    icon: "more_horiz",
    color: "gray",
    isDefault: true,
  },
  {
    id: "i1",
    name: "薪水",
    type: "income",
    icon: "payments",
    color: "green",
    isDefault: true,
  },
  {
    id: "i2",
    name: "零用錢",
    type: "income",
    icon: "savings",
    color: "red",
    isDefault: true,
  },
  {
    id: "i3",
    name: "獎金",
    type: "income",
    icon: "emoji_events",
    color: "yellow",
    isDefault: true,
  },
  {
    id: "i4",
    name: "其他",
    type: "income",
    icon: "more_horiz",
    color: "gray",
    isDefault: true,
  },
];

export const useTrackerStore = defineStore("tracker", () => {
  const books = ref<Book[]>(loadFromStorage("tracker_books", []));
  const records = ref<RecordItem[]>(loadFromStorage("tracker_records_v2", []));
  const currentBookId = ref<string | null>(
    loadFromStorage("tracker_current_book", null),
  );
  const personalRecords = ref<PersonalRecord[]>(
    loadFromStorage("tracker_personal_records", []),
  );

  // Settings & Theme
  const userProfileDefaults: UserProfile = { name: "", theme: "system", animations: true, isLoggedIn: false };
  const userProfile = ref<UserProfile>({
    ...userProfileDefaults,
    ...loadFromStorage("tracker_user_profile", userProfileDefaults),
  });
  const customCategories = ref<Category[]>(
    loadFromStorage("tracker_custom_categories", []),
  );
  const recordTemplates = ref<RecordTemplate[]>(
    loadFromStorage("tracker_templates", []),
  );

  // ---- Persistence ----
  const save = () => {
    saveToStorage("tracker_books", books.value);
    saveToStorage("tracker_records_v2", records.value);
    saveToStorage("tracker_current_book", currentBookId.value);
    saveToStorage("tracker_personal_records", personalRecords.value);
    saveToStorage("tracker_user_profile", userProfile.value);
    saveToStorage("tracker_custom_categories", customCategories.value);
    saveToStorage("tracker_templates", recordTemplates.value);
  };

  // ---- User Profile ----
  const isProfileSet = computed(() => userProfile.value.name.trim() !== "");

  function updateUserProfile(name: string) {
    userProfile.value.name = name.trim();
    save();
  }

  function loginAnonymous(name: string) {
    userProfile.value.isLoggedIn = false;
    userProfile.value.authToken = undefined;
    updateUserProfile(name);
  }

  function loginGoogle(data: { name: string; email: string; avatar: string; token: string }) {
    userProfile.value.name = data.name.trim();
    userProfile.value.email = data.email;
    userProfile.value.avatar = data.avatar;
    userProfile.value.authToken = data.token;
    userProfile.value.isLoggedIn = true;
    save();
  }

  function setTheme(theme: "light" | "dark" | "system") {
    userProfile.value.theme = theme;
    save();
  }

  function setAnimations(enabled: boolean) {
    userProfile.value.animations = enabled;
    save();
  }

  // ---- Categories ----
  const deletedCategoryIds = ref<string[]>(
    loadFromStorage("tracker_deleted_categories", []),
  );

  const allCategories = computed(() => {
    return [...defaultCategories, ...customCategories.value].filter(
      (c) => !deletedCategoryIds.value.includes(c.id),
    );
  });

  const addCustomCategory = (cat: Omit<Category, "id" | "isDefault">) => {
    const newCat: Category = {
      ...cat,
      id: crypto.randomUUID(),
      isDefault: false,
    };
    customCategories.value.push(newCat);
    saveToStorage("tracker_custom_categories", customCategories.value);
  };

  const deleteCustomCategory = (id: string) => {
    const isCustom = customCategories.value.some((c) => c.id === id);
    if (isCustom) {
      customCategories.value = customCategories.value.filter(
        (c) => c.id !== id,
      );
      saveToStorage("tracker_custom_categories", customCategories.value);
    } else {
      deletedCategoryIds.value.push(id);
      saveToStorage("tracker_deleted_categories", deletedCategoryIds.value);
    }
  };

  // ---- Book CRUD ----
  const currentBook = computed(
    () => books.value.find((b) => b.id === currentBookId.value) ?? null,
  );

  const createBook = (name: string, memberNames: string[]) => {
    if (!name.trim()) return null; // guard: book name must not be empty
    const members: Member[] = memberNames
      .filter((n) => n.trim())
      .map((n) => ({
        id: crypto.randomUUID(),
        name: n.trim(),
      }));

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

    book.name = name.trim();
    book.members = newMembers;
    save();
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
    book.members.push({
      id: crypto.randomUUID(),
      name: memberName.trim(),
    });
    save();
  };

  // ---- Shared Book Records ----
  const currentBookRecords = computed(() =>
    records.value.filter((r) => r.bookId === currentBookId.value),
  );

  const addRecord = (record: Omit<RecordItem, "id" | "bookId">) => {
    if (!currentBookId.value) return;
    records.value.unshift({
      ...record,
      id: crypto.randomUUID(),
      bookId: currentBookId.value,
    });
    save();
  };

  const updateRecord = (id: string, record: Partial<Omit<RecordItem, "id" | "bookId">>) => {
    const idx = records.value.findIndex((r) => r.id === id);
    if (idx !== -1) {
      records.value[idx] = { ...records.value[idx], ...record };
      save();
    }
  };

  const deleteRecord = (id: string) => {
    records.value = records.value.filter((r) => r.id !== id);
    save();
  };

  // ---- Book Summaries ----
  const totalExpense = computed(() =>
    currentBookRecords.value
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + r.amount, 0),
  );
  const totalIncome = computed(() =>
    currentBookRecords.value
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + r.amount, 0),
  );
  const balance = computed(() => totalIncome.value - totalExpense.value);

  // ---- Settlement Algorithm ----
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
          // "all" means split among all book members
          const splitIds = r.splitAmongIds.includes("all")
            ? allMemberIds
            : r.splitAmongIds;
          return splitIds.includes(member.id);
        })
        .reduce((s, r) => {
          const splitIds = r.splitAmongIds.includes("all")
            ? allMemberIds
            : r.splitAmongIds;
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
    const balances = memberStats.value.map((s) => ({
      member: s.member,
      net: s.net,
    }));
    const creditors = balances
      .filter((b) => b.net > 0)
      .sort((a, b) => b.net - a.net);
    const debtors = balances
      .filter((b) => b.net < 0)
      .sort((a, b) => a.net - b.net);
    const result: Settlement[] = [];
    let ci = 0,
      di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const credit = creditors[ci],
        debt = debtors[di];
      const amount = Math.min(credit.net, -debt.net);
      if (amount > 0)
        result.push({ from: debt.member, to: credit.member, amount });
      credit.net -= amount;
      debt.net += amount;
      if (credit.net === 0) ci++;
      if (debt.net === 0) di++;
    }
    return result;
  });

  // ---- Personal Records ----
  const addPersonalRecord = (record: Omit<PersonalRecord, "id">) => {
    personalRecords.value.unshift({
      ...record,
      id: crypto.randomUUID(),
    });
    save();
  };

  const updatePersonalRecord = (id: string, record: Partial<Omit<PersonalRecord, "id">>) => {
    const idx = personalRecords.value.findIndex((r) => r.id === id);
    if (idx !== -1) {
      personalRecords.value[idx] = { ...personalRecords.value[idx], ...record };
      save();
    }
  };

  const deletePersonalRecord = (id: string) => {
    personalRecords.value = personalRecords.value.filter((r) => r.id !== id);
    save();
  };

  // ---- Personal Summaries ----
  const personalTotalExpense = computed(() =>
    personalRecords.value
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + r.amount, 0),
  );
  const personalTotalIncome = computed(() =>
    personalRecords.value
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + r.amount, 0),
  );
  const personalBalance = computed(
    () => personalTotalIncome.value - personalTotalExpense.value,
  );

  // ---- Import My Share from Book ----
  // Imports this member's real personal cost (owed amount) into personal records.
  const importMyShareFromBook = (memberId: string) => {
    if (!currentBook.value) return;

    // Guard: prevent duplicate import from the same book
    const alreadyImported = personalRecords.value.some(
      (r) => r.sourceBookId === currentBook.value!.id,
    );
    if (alreadyImported) {
      alert(`已經匯入過「${currentBook.value.name}」的紀錄了！如果想重新測試，請先在列表中刪除舊的紀錄喔。`);
      return;
    }
    const stat = memberStats.value.find((s) => s.member.id === memberId);
    if (!stat || stat.owed <= 0) return;

    const today = new Date().toISOString().split("T")[0];
    addPersonalRecord({
      type: "expense",
      amount: stat.owed,
      category: currentBook.value.name, // Display the book name directly
      date: today,
      note: "", // Empty note as requested
      sourceBookId: currentBook.value.id,
    });
  };

  // ---- Templates ----
  const addTemplate = (template: Omit<RecordTemplate, "id">) => {
    recordTemplates.value.push({ ...template, id: crypto.randomUUID() });
    save();
  };

  const updateTemplate = (id: string, updates: Partial<RecordTemplate>) => {
    const idx = recordTemplates.value.findIndex(t => t.id === id);
    if (idx !== -1) {
      recordTemplates.value[idx] = { ...recordTemplates.value[idx], ...updates };
      save();
    }
  };

  const deleteTemplate = (id: string) => {
    recordTemplates.value = recordTemplates.value.filter(t => t.id !== id);
    save();
  };

  const syncToCloud = async () => {
    if (!userProfile.value.isLoggedIn || !userProfile.value.authToken) return;
    const payload = {
      books: books.value,
      records: records.value,
      personal_records: personalRecords.value,
      categories: customCategories.value,
      templates: recordTemplates.value
    };
    try {
      await pushSyncData(payload);
      alert("資料已成功同步至雲端！");
    } catch (e) {
      alert("同步失敗，請稍後再試。");
    }
  };

  const overwriteFromCloud = async () => {
    if (!userProfile.value.isLoggedIn || !userProfile.value.authToken) return;
    if (!confirm("這將會覆蓋此裝置上的所有本地資料，確定要繼續嗎？")) return;
    try {
      const response = await pullSyncData();
      const data = response.data;
      customCategories.value = data.categories || [];
      books.value = data.books || [];
      records.value = data.records || [];
      personalRecords.value = data.personal_records || [];
      recordTemplates.value = data.templates || [];
      save();
      alert("資料已成功從雲端回復！");
    } catch (e) {
      alert("下載失敗，請稍後再試。");
    }
  };

  return {
    userProfile,
    isProfileSet,
    updateUserProfile,
    loginAnonymous,
    loginGoogle,
    setTheme,
    setAnimations,
    books,
    records,
    currentBookId,
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
    personalRecords,
    addPersonalRecord,
    updatePersonalRecord,
    deletePersonalRecord,
    personalTotalExpense,
    personalTotalIncome,
    personalBalance,
    importMyShareFromBook,

    customCategories,
    allCategories,
    addCustomCategory,
    deleteCustomCategory,

    recordTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,

    syncToCloud,
    overwriteFromCloud,
  };
});
