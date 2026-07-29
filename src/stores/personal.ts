import type { Ref, ComputedRef } from "vue";
import { computed } from "vue";
import type { PersonalRecord } from "./types";
import { useToast } from "../composables/useToast";
import { getLocalDateString } from "../utils/date";
import { i18n } from "../i18n";

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
  save: () => Promise<void>,
) {
  // ---- CRUD ----
  const addPersonalRecord = async (record: Omit<PersonalRecord, "id">) => {
    personalRecords.value.unshift({
      ...record,
      id: crypto.randomUUID(),
      isSynced: false,
    });
    await save();
  };

  const updatePersonalRecord = async (
    id: string,
    record: Partial<Omit<PersonalRecord, "id">>,
  ) => {
    const idx = personalRecords.value.findIndex((r) => r.id === id);
    if (idx !== -1) {
      personalRecords.value[idx] = {
        ...personalRecords.value[idx],
        ...record,
        isSynced: false,
      };
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

  // ---- Import from Book ----
  const importMyShareFromBook = async (memberId: string) => {
    if (!currentBook.value) return;

    const alreadyImported = personalRecords.value.some(
      (r) => r.sourceBookId === currentBook.value!.id,
    );
    if (alreadyImported) {
      const toast = useToast();
      toast.warning(
        i18n.global.t("personal.alreadyImported", {
          name: currentBook.value.name,
        }),
      );
      return;
    }
    const stat = memberStats.value.find((s) => s.member.id === memberId);
    if (!stat || stat.owed <= 0) return;

    const today = getLocalDateString();
    await addPersonalRecord({
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
      personalRecords.value.push(
        ...recordsToImport.map((r) => ({ ...r, isSynced: false })),
      );
      await save();
    },
  };
}
