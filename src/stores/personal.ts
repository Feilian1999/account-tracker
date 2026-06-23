import type { Ref, ComputedRef } from "vue";
import { computed } from "vue";
import type { PersonalRecord } from "./types";
import { useToast } from "../composables/useToast";
import { getLocalDateString } from "../utils/date";

/**
 * Personal record CRUD, summaries, and book import.
 */
export function setupPersonalActions(
  personalRecords: Ref<PersonalRecord[]>,
  memberStats: ComputedRef<
    {
      member: { id: string; name: string };
      paid: number;
      owed: number;
      net: number;
    }[]
  >,
  currentBook: ComputedRef<{ id: string; name: string } | null>,
  pendingDeletePersonalRecordIds: Ref<string[]>,
  save: () => Promise<void>
) {
  // ---- CRUD ----
  const addPersonalRecord = async (record: Omit<PersonalRecord, "id">) => {
    personalRecords.value.unshift({ ...record, id: crypto.randomUUID(), isSynced: false });
    await save();
  };

  const updatePersonalRecord = async (
    id: string,
    record: Partial<Omit<PersonalRecord, "id">>,
  ) => {
    const idx = personalRecords.value.findIndex((r) => r.id === id);
    if (idx !== -1) {
      personalRecords.value[idx] = { ...personalRecords.value[idx], ...record, isSynced: false };
      await save();
    }
  };

  const deletePersonalRecord = async (id: string) => {
    pendingDeletePersonalRecordIds.value.push(id);
    personalRecords.value = personalRecords.value.filter((r) => r.id !== id);
    await save();
  };

  // ---- Summaries ----
  const personalTotalExpense = computed(() =>
    personalRecords.value.reduce(
      (s, r) => (r.type === "expense" ? s + r.amount : s),
      0,
    ),
  );
  const personalTotalIncome = computed(() =>
    personalRecords.value.reduce(
      (s, r) => (r.type === "income" ? s + r.amount : s),
      0,
    ),
  );
  const personalBalance = computed(
    () => personalTotalIncome.value - personalTotalExpense.value,
  );

  // ---- Import from Book ----
  const importMyShareFromBook = (memberId: string) => {
    if (!currentBook.value) return;

    const alreadyImported = personalRecords.value.some(
      (r) => r.sourceBookId === currentBook.value!.id,
    );
    if (alreadyImported) {
      const toast = useToast();
      toast.warning(
        `已經匯入過「${currentBook.value.name}」的紀錄了！如果想重新測試，請先在列表中刪除舊的紀錄喔。`,
      );
      return;
    }
    const stat = memberStats.value.find((s) => s.member.id === memberId);
    if (!stat || stat.owed <= 0) return;

    const today = getLocalDateString();
    addPersonalRecord({
      type: "expense",
      amount: stat.owed,
      category: currentBook.value.name,
      date: today,
      note: "",
      sourceBookId: currentBook.value.id,
    });
  };

  return {
    addPersonalRecord,
    updatePersonalRecord,
    deletePersonalRecord,
    personalTotalExpense,
    personalTotalIncome,
    personalBalance,
    importMyShareFromBook,
    importPersonalRecords: async (recordsToImport: PersonalRecord[]) => {
      personalRecords.value.push(...recordsToImport.map((r) => ({ ...r, isSynced: false })));
      await save();
    },
  };
}
