import type { Ref, ComputedRef } from "vue";
import { computed } from "vue";
import type { CurrencyCode, PersonalRecord } from "./types";
import { useToast } from "../composables/useToast";
import { getLocalDateString } from "../utils/date";
import { buildMoneyFields, sumInCurrency } from "../utils/currency";
import { getRate } from "../utils/fxRates";
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
  currentBookCurrency: ComputedRef<CurrencyCode>,
  baseCurrency: ComputedRef<CurrencyCode>,
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

  // ---- Summaries (records pending conversion are excluded) ----
  const personalTotalExpense = computed(() =>
    sumInCurrency(personalRecords.value, "expense", baseCurrency.value),
  );
  const personalTotalIncome = computed(() =>
    sumInCurrency(personalRecords.value, "income", baseCurrency.value),
  );
  const personalBalance = computed(
    () => personalTotalIncome.value - personalTotalExpense.value,
  );

  // ---- Import from Book ----
  /** Resolves false when nothing was imported. */
  const importMyShareFromBook = async (memberId: string) => {
    if (!currentBook.value) return false;

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
      return false;
    }
    const stat = memberStats.value.find((s) => s.member.id === memberId);
    if (!stat || stat.owed <= 0) return false;

    // Capture before the await: the caller restores its own current book after.
    const book = currentBook.value;
    const bookCurrency = currentBookCurrency.value;
    const target = baseCurrency.value;
    const today = getLocalDateString();

    // `owed` is in the book currency; convert it once, at today's rate.
    const fx = await getRate(bookCurrency, target, today);
    if (!fx) {
      useToast().error(i18n.global.t("currency.rateUnavailable"));
      return false;
    }
    await addPersonalRecord({
      type: "expense",
      ...buildMoneyFields({
        inputAmount: stat.owed,
        inputCurrency: bookCurrency,
        targetCurrency: target,
        rate: fx.rate,
        rateDate: fx.rateDate,
        rateSource: fx.source,
      }),
      category: book.name,
      date: today,
      note: "",
      sourceBookId: book.id,
    });
    return true;
  };

  return {
    addPersonalRecord,
    updatePersonalRecord,
    deletePersonalRecord,
    personalTotalExpense,
    personalTotalIncome,
    personalBalance,
    importMyShareFromBook,
    // Third-party backups carry no currency: tag them with the base currency.
    importPersonalRecords: async (recordsToImport: PersonalRecord[]) => {
      personalRecords.value.push(
        ...recordsToImport.map((r) => ({
          ...r,
          amountCurrency: r.amountCurrency ?? baseCurrency.value,
          isSynced: false,
        })),
      );
      await save();
    },
  };
}
