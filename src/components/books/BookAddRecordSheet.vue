<template>
  <RecordSheetLayout
    :modelValue="modelValue"
    :title="$t('recordSheet.title')"
    :subtitle="$t('recordSheet.subtitle', { name: bookName })"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <!-- Header Actions -->
    <template #header-actions>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="form.type = form.type === 'expense' ? 'income' : 'expense'"
          class="flex rounded-lg bg-gray-100 p-0.5 transition-transform active:scale-95 dark:bg-gray-800"
        >
          <div
            :class="[
              'rounded-md px-2.5 py-1 text-xs font-bold transition-all',
              form.type === 'expense'
                ? 'bg-white text-red-700 shadow-sm dark:bg-gray-700 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ $t("common.expense") }}
          </div>
          <div
            :class="[
              'rounded-md px-2.5 py-1 text-xs font-bold transition-all',
              form.type === 'income'
                ? 'bg-white text-emerald-700 shadow-sm dark:bg-gray-700 dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ $t("common.income") }}
          </div>
        </button>
        <CloseButton
          @click="close"
          class="rounded-full bg-gray-100 !p-1.5 dark:bg-gray-800"
        />
      </div>
    </template>

    <!-- Form Body -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Templates Quick Select -->
      <div
        v-if="!editRecordId && store.recordTemplates.length > 0"
        class="-mx-2 mb-4"
      >
        <div
          class="no-scrollbar flex items-center gap-2 overflow-x-auto px-2 pb-1"
        >
          <button
            v-for="tpl in store.recordTemplates"
            :key="tpl.id"
            @click="applyTemplate(tpl.id)"
            type="button"
            class="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50/50 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-100 active:scale-95 dark:border-gray-700/50 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <div
              class="flex h-5 w-5 items-center justify-center rounded-full"
              :class="[getTemplateColorClass(tpl.category)]"
            >
              <CategoryIcon
                :name="getTemplateIcon(tpl.category)"
                style="transform: scale(0.6)"
              />
            </div>
            {{ tpl.name }}
          </button>
        </div>
      </div>

      <!-- 1. Date -->
      <div
        class="flex items-center gap-3 border-b border-gray-100 pb-2 dark:border-gray-800"
      >
        <span class="material-symbols-outlined text-xl text-gray-400"
          >calendar_today</span
        >
        <label
          class="w-16 shrink-0 text-sm font-semibold text-gray-600 dark:text-gray-400"
          >{{ $t("common.date") }}</label
        >
        <input
          v-model="form.date"
          type="date"
          required
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          class="relative z-10 w-full flex-1 cursor-pointer bg-transparent text-right font-bold text-gray-800 outline-none dark:text-gray-200"
        />
      </div>

      <!-- 2. Amount -->
      <div
        class="flex items-center gap-3 border-b border-gray-100 pb-2 dark:border-gray-800"
      >
        <span class="material-symbols-outlined text-xl text-gray-400"
          >attach_money</span
        >
        <label
          class="w-16 shrink-0 text-sm font-semibold text-gray-600 dark:text-gray-400"
          >{{ $t("common.amount") }}</label
        >
        <div class="flex flex-1 items-center justify-end gap-2">
          <CurrencySelect v-model="inputCurrency" compact />
          <input
            ref="amountInput"
            v-model="form.amountStr"
            type="text"
            inputmode="none"
            @focus="showKeyboard = true"
            @keydown.enter.prevent="finishAmountEntry"
            required
            placeholder="0"
            class="w-full bg-transparent text-right text-xl font-bold text-gray-800 caret-violet-500 outline-none dark:text-gray-100"
          />
        </div>
      </div>

      <FxRateRow
        v-if="isForeign"
        :currency="inputCurrency"
        :target="currency"
        :rate="fxRate"
        :rateDate="fxRateDate"
        :source="fxSource"
        :loading="fxLoading"
        :converted="fxConverted"
        @update:rate="setManualRate"
      />

      <!-- 3. Category — opens the picker; kept outside the keyboard's v-show so
           it stays reachable while the amount is being typed. -->
      <button
        type="button"
        class="flex w-full items-center gap-3 border-b border-gray-100 pb-2 text-left transition-opacity active:opacity-60 dark:border-gray-800"
        @click="showCategoryPicker = true"
      >
        <span class="material-symbols-outlined text-xl text-gray-400"
          >category</span
        >
        <span
          class="w-16 shrink-0 text-sm font-semibold text-gray-600 dark:text-gray-400"
          >{{ $t("common.category") }}</span
        >
        <span class="flex flex-1 items-center justify-end gap-2 text-right">
          <span
            class="text-sm font-bold"
            :class="
              form.type === 'expense'
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            "
          >
            {{
              $te(`categories.${currentCategoryId}`)
                ? $t(`categories.${currentCategoryId}`)
                : currentCategoryObj?.name || $t("common.select")
            }}
          </span>
          <span
            v-if="currentCategoryId"
            class="flex h-6 w-6 items-center justify-center rounded-[6px] text-white shadow-sm"
            :class="form.type === 'expense' ? 'bg-red-600' : 'bg-emerald-600'"
          >
            <CategoryIcon :name="currentCategoryIcon" class="text-[14px]" />
          </span>
          <span class="material-symbols-outlined text-lg text-gray-400"
            >chevron_right</span
          >
        </span>
      </button>

      <CalculatorKeyboard
        v-if="showKeyboard"
        v-model="form.amountStr"
        :decimals="decimalsOf(inputCurrency)"
        @submit="showKeyboard = false"
        class="mt-1 mb-2 rounded-2xl bg-gray-50 p-2 dark:bg-gray-800/50"
      />

      <div v-show="!showKeyboard" class="animate-fade-in space-y-4">
        <!-- 4. Note -->
        <div
          class="flex items-center gap-3 border-b border-gray-100 pb-3 dark:border-gray-800"
        >
          <span class="material-symbols-outlined text-xl text-gray-400"
            >edit_note</span
          >
          <label
            class="w-16 shrink-0 text-sm font-semibold text-gray-600 dark:text-gray-400"
            >{{ $t("common.note") }}</label
          >
          <input
            v-model="form.note"
            type="text"
            :placeholder="$t('common.note')"
            class="w-full flex-1 bg-transparent text-right font-medium text-gray-800 outline-none dark:text-gray-200"
          />
        </div>

        <!-- Paid By & Split Among -->
        <div v-if="form.type === 'expense'" class="mt-2 space-y-4 pt-2">
          <!-- Paid By -->
          <div class="flex flex-col gap-2 pt-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-xl text-gray-400"
                >person</span
              >
              <label
                class="text-xs font-semibold text-gray-500 dark:text-gray-400"
                >{{ $t("recordSheet.paidBy") }}</label
              >
            </div>
            <div class="flex flex-wrap gap-2 pl-7">
              <button
                v-for="m in members"
                :key="'paid-' + m.id"
                type="button"
                @click="form.paidById = m.id"
                :class="[
                  'flex items-center gap-1.5 rounded-lg border py-1 pr-3 pl-1 text-xs font-bold transition-all',
                  form.paidById === m.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                ]"
              >
                <MemberAvatar :name="m.name" :seed="m.id" size="xs" />
                {{ m.name }}
              </button>
            </div>
          </div>

          <!-- Split Among -->
          <div
            class="mt-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors dark:border-gray-700/50 dark:bg-gray-800/50"
          >
            <!-- Header: label + mode toggle + select all -->
            <div class="mb-3 flex items-center justify-between">
              <label
                class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400"
              >
                <span
                  class="material-symbols-outlined text-[18px] text-gray-400"
                  >group</span
                >
                {{ $t("recordSheet.splitAmong") }}
              </label>
              <div class="flex items-center gap-2">
                <!-- Mode Toggle -->
                <div
                  class="flex rounded-md bg-gray-200/70 p-0.5 dark:bg-gray-700"
                >
                  <button
                    type="button"
                    @click="form.splitMode = 'equal'"
                    :class="[
                      'rounded px-2 py-0.5 text-[11px] font-bold transition-all',
                      form.splitMode === 'equal'
                        ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-600 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400',
                    ]"
                  >
                    {{ $t("recordSheet.splitEqual") }}
                  </button>
                  <button
                    type="button"
                    @click="form.splitMode = 'custom'"
                    :class="[
                      'rounded px-2 py-0.5 text-[11px] font-bold transition-all',
                      form.splitMode === 'custom'
                        ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-600 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400',
                    ]"
                  >
                    {{ $t("recordSheet.splitCustom") }}
                  </button>
                </div>
                <!-- Select All (equal mode only) -->
                <button
                  v-if="form.splitMode === 'equal'"
                  type="button"
                  @click="toggleAll"
                  class="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {{
                    form.splitAmongIds.length === members.length
                      ? $t("recordSheet.unselectAll")
                      : $t("recordSheet.selectAll")
                  }}
                </button>
              </div>
            </div>

            <!-- EQUAL MODE -->
            <template v-if="form.splitMode === 'equal'">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="m in members"
                  :key="m.id"
                  type="button"
                  @click="toggleMember(m.id)"
                  :class="[
                    'flex items-center gap-1.5 rounded-lg border py-1 pr-2.5 pl-1 text-xs font-bold transition-all',
                    form.splitAmongIds.includes(m.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
                  ]"
                >
                  <MemberAvatar :name="m.name" :seed="m.id" size="xs" />
                  {{ m.name }}
                </button>
              </div>
              <p
                v-if="form.splitAmongIds.length > 0 && isValidAmount"
                class="mt-2 text-right text-xs font-bold text-blue-600 dark:text-blue-400"
              >
                {{
                  $t("recordSheet.splitPerPerson", {
                    amount: formatMoney(
                      splitEvenly(
                        fxConverted,
                        form.splitAmongIds.length,
                        currency,
                      )[0],
                      currency,
                      locale,
                    ),
                  })
                }}
              </p>
            </template>

            <!-- CUSTOM MODE -->
            <template v-else>
              <div class="space-y-2">
                <div
                  v-for="m in members"
                  :key="'custom-' + m.id"
                  class="flex items-center gap-3 rounded-lg border bg-white px-3 py-2 dark:bg-gray-800"
                  :class="
                    isUnfilled(m.id) && hasAnyFilled
                      ? 'border-blue-200 dark:border-blue-700'
                      : 'border-gray-100 dark:border-gray-700'
                  "
                >
                  <span
                    class="w-16 shrink-0 truncate text-xs font-bold text-gray-700 dark:text-gray-300"
                    >{{ m.name }}</span
                  >
                  <span class="text-xs font-semibold text-gray-400">{{
                    symbolOf(inputCurrency)
                  }}</span>
                  <div class="relative flex-1">
                    <input
                      v-model="form.splitCustomAmounts[m.id]"
                      type="text"
                      @blur="evaluateCustomAmount(m.id)"
                      :placeholder="
                        isUnfilled(m.id) && hasAnyFilled && autoPerPerson >= 0
                          ? autoPerPerson.toLocaleString()
                          : '0'
                      "
                      class="w-full bg-transparent text-right text-sm font-bold outline-none"
                      :class="
                        isUnfilled(m.id) && hasAnyFilled
                          ? 'text-blue-500 placeholder:text-blue-400/60 dark:text-blue-400 dark:placeholder:text-blue-500/60'
                          : 'text-gray-800 dark:text-gray-100'
                      "
                    />
                  </div>
                  <span
                    v-if="isUnfilled(m.id) && hasAnyFilled"
                    class="shrink-0 text-[10px] font-bold text-blue-400 dark:text-blue-500"
                    >{{ $t("recordSheet.autoCalc") }}</span
                  >
                </div>
              </div>
              <!-- Validation hint -->
              <p
                v-if="isValidAmount && autoPerPerson < 0"
                class="mt-2 text-right text-xs font-bold text-red-500"
              >
                {{
                  $t("recordSheet.splitOverflow", {
                    excess: formatMoney(
                      Math.abs(remainingAmount),
                      inputCurrency,
                      locale,
                    ),
                  })
                }}
              </p>
              <p
                v-else-if="isValidAmount"
                class="mt-2 text-right text-xs font-bold"
                :class="
                  Math.abs(filledAllocated - Number(form.amountStr)) < 0.01
                    ? 'text-emerald-500'
                    : 'text-gray-400'
                "
              >
                {{
                  $t("recordSheet.splitTotal", {
                    total: formatMoney(filledAllocated, inputCurrency, locale),
                  })
                }}
                /
                {{ formatMoney(Number(form.amountStr), inputCurrency, locale) }}
              </p>
            </template>
          </div>
        </div>

        <!-- Save as Template -->
        <div v-if="!editRecordId" class="flex items-center gap-2.5 px-1 py-1">
          <input
            id="saveAsTemplateBook"
            v-model="shouldSaveAsTemplate"
            type="checkbox"
            class="h-4.5 w-4.5 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800"
          />
          <label
            for="saveAsTemplateBook"
            class="cursor-pointer text-xs font-bold text-gray-500 dark:text-gray-400"
          >
            {{ $t("templates.saveAsTemplate") }}
          </label>
        </div>

        <!-- Submit Button -->
        <BaseButton
          type="submit"
          :disabled="!isSplitValid"
          :variant="isSplitValid ? 'primary' : 'secondary'"
          class="mt-2 w-full shadow-lg shadow-blue-600/20"
        >
          {{ saveButtonText }}
        </BaseButton>
      </div>
    </form>
  </RecordSheetLayout>

  <CategoryPickerSheet
    v-model="showCategoryPicker"
    :categories="activeCats"
    :selectedId="form.categoryId"
    :type="form.type"
    @select="form.categoryId = $event"
  />
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed, nextTick, ref, toRef, watch } from "vue";
import { useTrackerStore } from "../../stores/tracker";
import type { Member } from "../../stores/tracker";
import { colorMap } from "../../utils/category";
import RecordSheetLayout from "../RecordSheetLayout.vue";
import BaseButton from "../BaseButton.vue";
import CloseButton from "../CloseButton.vue";
import CategoryIcon from "../CategoryIcon.vue";
import CalculatorKeyboard from "../CalculatorKeyboard.vue";
import CategoryPickerSheet from "../CategoryPickerSheet.vue";
import MemberAvatar from "../MemberAvatar.vue";
import { getLocalDateString } from "../../utils/date";
import { parseAmountExpression } from "../../utils/amountExpression";
import { usePrimaryAction } from "../../composables/usePrimaryAction";
import { useFxInput } from "../../composables/useFxInput";
import CurrencySelect from "../CurrencySelect.vue";
import FxRateRow from "../FxRateRow.vue";
import type { CurrencyCode } from "../../stores/types";
import {
  allocateProportionally,
  bookedOf,
  currencyOf,
  decimalsOf,
  formatMoney,
  originalOf,
  roundTo,
  splitEvenly,
  symbolOf,
} from "../../utils/currency";
const props = defineProps<{
  modelValue: boolean;
  bookName: string;
  members: Member[];
  /** The book currency: every stored amount (and custom split) is in it. */
  currency: CurrencyCode;
  editRecordId?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { t, locale } = useI18n();
const store = useTrackerStore();
const today = getLocalDateString();

const initCustomAmounts = () => {
  const map: Record<string, string> = {};
  for (const m of props.members) map[m.id] = "";
  return map;
};

const defaultForm = () => ({
  type: "expense" as "expense" | "income",
  amountStr: "",
  categoryId: "",
  paidById: props.members[0]?.id ?? "",
  splitAmongIds: props.members.map((m) => m.id),
  splitMode: "equal" as "equal" | "custom",
  splitCustomAmounts: initCustomAmounts(),
  date: today,
  note: "",
});

const form = ref(defaultForm());

// Typed in any currency, booked in the book currency.
const {
  currency: inputCurrency,
  rate: fxRate,
  rateDate: fxRateDate,
  source: fxSource,
  loading: fxLoading,
  isForeign,
  ready: fxReady,
  converted: fxConverted,
  setManualRate,
  reset: resetFx,
  load: loadFx,
  build: buildMoney,
} = useFxInput({
  target: computed(() => props.currency),
  date: computed(() => form.value.date),
  amount: computed(() => parseAmountExpression(form.value.amountStr) ?? 0),
});

const showKeyboard = ref(false);
const showCategoryPicker = ref(false);
const shouldSaveAsTemplate = ref(false);

const expenseCats = computed(() =>
  store.allCategories.filter((c) => c.type === "expense"),
);
const incomeCats = computed(() =>
  store.allCategories.filter((c) => c.type === "income"),
);
const activeCats = computed(() =>
  form.value.type === "expense" ? expenseCats.value : incomeCats.value,
);

const currentCategoryObj = computed(() =>
  activeCats.value.find((c) => c.id === form.value.categoryId),
);
const currentCategoryId = computed(() => form.value.categoryId);
const currentCategoryIcon = computed(
  () => currentCategoryObj.value?.icon ?? "category",
);

const evaluateAmount = () => {
  const str = form.value.amountStr.trim();
  if (!str) return;
  if (/^[\d+\-*/. ()]+$/.test(str)) {
    try {
      const result = new Function(`return ${str}`)();
      if (isFinite(result) && result > 0) {
        // Round to the input currency's precision — flooring silently turned
        // 10.99 into 10 and 0.5 into an unsaveable 0.
        form.value.amountStr = String(roundTo(result, inputCurrency.value));
      }
    } catch {
      // ignore
    }
  }
};

const finishAmountEntry = () => {
  evaluateAmount();
  showKeyboard.value = false;
};

const isValidAmount = computed(() => {
  const v = Number(form.value.amountStr);
  return !isNaN(v) && v > 0;
});

// Custom split computed helpers
const isUnfilled = (id: string) => {
  const val = String(form.value.splitCustomAmounts[id] ?? "").trim();
  return val === "";
};

const customAmountValue = (id: string) => {
  const amount = parseAmountExpression(
    form.value.splitCustomAmounts[id] ?? "",
    Number(form.value.amountStr),
  );
  return amount !== null && amount >= 0 ? amount : null;
};

const evaluateCustomAmount = (id: string) => {
  const amount = customAmountValue(id);
  if (amount !== null) {
    form.value.splitCustomAmounts[id] = String(
      roundTo(amount, inputCurrency.value),
    );
  }
};

const hasAnyFilled = computed(() =>
  props.members.some((m) => !isUnfilled(m.id)),
);

const hasInvalidCustomAmount = computed(() =>
  props.members.some(
    (m) => !isUnfilled(m.id) && customAmountValue(m.id) === null,
  ),
);

// Sum of manually-filled member amounts
const filledAllocated = computed(() => {
  return props.members.reduce((sum, m) => {
    if (isUnfilled(m.id)) return sum;
    const amount = customAmountValue(m.id);
    return sum + (amount ?? 0);
  }, 0);
});

// Count of unfilled members
const unfilledCount = computed(
  () => props.members.filter((m) => isUnfilled(m.id)).length,
);

// Remaining total after filled members
const remainingAmount = computed(() => {
  const total = Number(form.value.amountStr) || 0;
  return Math.round((total - filledAllocated.value) * 100) / 100;
});

// Per-person auto amount for each unfilled member (display hint; the exact
// cent-accurate distribution is computed on submit).
const autoPerPerson = computed(() => {
  if (unfilledCount.value === 0) return 0;
  return Math.round((remainingAmount.value / unfilledCount.value) * 100) / 100;
});

const isSplitValid = computed(() => {
  if (!isValidAmount.value || !fxReady.value) return false;
  if (form.value.type !== "expense") return true;
  if (form.value.splitMode === "equal")
    return form.value.splitAmongIds.length > 0;
  if (hasInvalidCustomAmount.value) return false;
  // custom mode: remaining must be >= 0 (whether there are unfilled or not)
  if (unfilledCount.value > 0) {
    return remainingAmount.value >= 0;
  } else {
    // all filled manually → total must match
    const total = Number(form.value.amountStr) || 0;
    return Math.abs(filledAllocated.value - total) < 0.01;
  }
});

const saveButtonText = computed(() => {
  if (!isValidAmount.value) return t("recordSheet.validation.enterAmount");
  if (fxLoading.value) return t("currency.loadingRate");
  if (!fxReady.value) return t("currency.enterRate");
  if (form.value.type !== "expense") return t("common.save");

  if (form.value.splitMode === "equal") {
    if (form.value.splitAmongIds.length === 0)
      return t("recordSheet.validation.selectMembers");
  } else {
    // custom mode
    if (remainingAmount.value < 0)
      return t("recordSheet.validation.customOverflow");
    if (unfilledCount.value === 0) {
      const total = Number(form.value.amountStr) || 0;
      if (Math.abs(filledAllocated.value - total) >= 0.01)
        return t("recordSheet.validation.customMismatch");
    }
  }

  return t("common.save");
});

const applyTemplate = (templateId: string) => {
  const t = store.recordTemplates.find((x) => x.id === templateId);
  if (!t) return;

  form.value.type = t.type;
  form.value.categoryId = t.category;
  form.value.amountStr = t.amount !== null ? String(t.amount) : "";
  form.value.note = t.note || "";
  resetFx(currencyOf(t.currency));

  if (t.amount === null) {
    showKeyboard.value = true;
  }
};

const getTemplateIcon = (categoryId: string) => {
  return (
    store.allCategories.find((c) => c.id === categoryId)?.icon ?? "more_horiz"
  );
};

const getTemplateColorClass = (categoryId: string) => {
  const color =
    store.allCategories.find((c) => c.id === categoryId)?.color ?? "gray";
  const styles = colorMap[color] ?? colorMap.gray;
  return `${styles.bg} ${styles.text}`;
};

// Reset & sync category when type changes or sheet opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      shouldSaveAsTemplate.value = false;
      if (props.editRecordId) {
        const r = store.records.find((x) => x.id === props.editRecordId);
        if (r) {
          const cat = store.allCategories.find(
            (c) => c.name === r.category && c.type === r.type,
          );
          // Edit what was typed, in the currency it was typed in: a foreign
          // custom split keeps its typed per-member amounts on `original`.
          const original = originalOf(r, props.currency);
          const typedSplit =
            original.currency === props.currency
              ? r.splitCustomAmounts
              : (original.splitCustomAmounts ?? r.splitCustomAmounts);
          // Restore custom amounts — pre-populate all members, then overlay saved values
          const customAmts: Record<string, string> = initCustomAmounts();
          if (typedSplit) {
            for (const [k, v] of Object.entries(typedSplit)) {
              customAmts[k] = String(v);
            }
          }
          // Validate restored member IDs against current members
          const currentMemberIds = new Set(props.members.map((m) => m.id));
          const validSplitIds = r.splitAmongIds.filter((id) =>
            currentMemberIds.has(id),
          );
          const validPaidById = currentMemberIds.has(r.paidById)
            ? r.paidById
            : (props.members[0]?.id ?? "");

          form.value = {
            type: r.type,
            amountStr: String(original.amount),
            categoryId: cat?.id || r.category,
            paidById: validPaidById,
            splitAmongIds:
              validSplitIds.length > 0
                ? validSplitIds
                : props.members.map((m) => m.id),
            splitMode: r.splitCustomAmounts ? "custom" : "equal",
            splitCustomAmounts: customAmts,
            date: r.date,
            note: r.note,
          };
          if (original.currency === props.currency) {
            resetFx(original.currency);
          } else {
            const booked = bookedOf(r, props.currency);
            loadFx({
              currency: original.currency,
              rate: booked.rate,
              rateDate: booked.rateDate,
              source: booked.rateSource,
            });
          }
          return;
        }
      }
      const reset = defaultForm();
      reset.categoryId = expenseCats.value[0]?.id ?? "";
      form.value = reset;
      resetFx();
      showKeyboard.value = true;
    } else {
      showKeyboard.value = false;
      showCategoryPicker.value = false;
    }
  },
);

// When switching to custom mode, ensure all member keys exist
watch(
  () => form.value.splitMode,
  (mode) => {
    if (mode === "custom") {
      for (const m of props.members) {
        if (!(m.id in form.value.splitCustomAmounts)) {
          form.value.splitCustomAmounts[m.id] = "";
        }
      }
    }
  },
);

watch(
  () => form.value.type,
  (newType) => {
    const cats = newType === "expense" ? expenseCats.value : incomeCats.value;
    if (!cats.find((c) => c.id === form.value.categoryId)) {
      form.value.categoryId = cats[0]?.id ?? "";
    }
  },
);

const toggleMember = (id: string) => {
  const idx = form.value.splitAmongIds.indexOf(id);
  if (idx >= 0) {
    form.value.splitAmongIds.splice(idx, 1);
  } else {
    form.value.splitAmongIds.push(id);
  }
};

const toggleAll = () => {
  const all = props.members.map((m) => m.id);
  form.value.splitAmongIds =
    form.value.splitAmongIds.length === all.length ? [] : [...all];
};

const close = () => emit("update:modelValue", false);

const submitting = ref(false);
const amountInput = ref<HTMLInputElement>();

usePrimaryAction(toRef(props, "modelValue"), () => handleSubmit(), 1);

watch(
  () => props.modelValue,
  (open) => {
    if (open) nextTick(() => amountInput.value?.focus());
  },
);

const handleSubmit = async () => {
  if (submitting.value) return;
  evaluateAmount();
  const amt = Number(form.value.amountStr);
  if (!amt || isNaN(amt) || amt <= 0) return;
  if (!fxReady.value) return;
  const isExpense = form.value.type === "expense";
  if (
    isExpense &&
    form.value.splitMode === "equal" &&
    form.value.splitAmongIds.length === 0
  )
    return;
  if (
    isExpense &&
    form.value.splitMode === "custom" &&
    (hasInvalidCustomAmount.value || remainingAmount.value < 0)
  )
    return;

  submitting.value = true;
  try {
    const money = buildMoney(amt);

    // Build custom amounts map for storage (in the book currency)
    let splitCustomAmountsOut: Record<string, number> | undefined;
    if (isExpense && form.value.splitMode === "custom") {
      // 1. Shares in the typed currency: the remaining total is divided across
      //    unfilled members so the shares sum EXACTLY to the amount (flooring
      //    each share left a permanent unsettleable gap).
      const unfilled = props.members.filter((m) => isUnfilled(m.id));
      const autoShares = splitEvenly(
        Math.max(0, remainingAmount.value),
        unfilled.length,
        inputCurrency.value,
      );
      const typed: Record<string, number> = {};
      props.members.forEach((m) => {
        const ui = unfilled.indexOf(m);
        typed[m.id] = ui >= 0 ? autoShares[ui] : (customAmountValue(m.id) ?? 0);
      });
      // 2. Carry them over to the book currency proportionally, so they still
      //    sum exactly to the converted amount.
      const ids = props.members.map((m) => m.id);
      const booked = allocateProportionally(
        money.amount,
        ids.map((id) => typed[id]),
        props.currency,
      );
      splitCustomAmountsOut = Object.fromEntries(
        ids.map((id, i) => [id, booked[i]]),
      );
      if (money.original) {
        money.original = { ...money.original, splitCustomAmounts: typed };
      }
    }

    // In custom mode the members actually charged are those with a positive share,
    // not the (possibly stale) equal-mode selection.
    const splitAmongOut = !isExpense
      ? []
      : form.value.splitMode === "custom" && splitCustomAmountsOut
        ? Object.keys(splitCustomAmountsOut).filter(
            (id) => (splitCustomAmountsOut![id] ?? 0) > 0,
          )
        : form.value.splitAmongIds;

    const data = {
      type: form.value.type,
      ...money,
      category: currentCategoryObj.value?.name || form.value.categoryId,
      date: form.value.date,
      note: form.value.note,
      paidById: isExpense ? form.value.paidById : "",
      splitAmongIds: splitAmongOut,
      splitCustomAmounts: splitCustomAmountsOut,
    };

    if (props.editRecordId) {
      await store.updateRecord(props.editRecordId, data);
    } else {
      await store.addRecord(data);

      // Save as template if requested
      if (shouldSaveAsTemplate.value) {
        await store.addTemplate({
          name:
            form.value.note ||
            currentCategoryObj.value?.name ||
            form.value.categoryId,
          type: form.value.type,
          category: form.value.categoryId,
          amount: amt,
          currency: inputCurrency.value,
          note: form.value.note,
        });
      }
    }
    close();
  } finally {
    submitting.value = false;
  }
};
watch(
  () => props.modelValue,
  (val) => {
    if (val && store.currentBookId) {
      store.pullSharedBook(store.currentBookId);
    }
  },
);
</script>

<style scoped>
/* Hide spin buttons for number inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
