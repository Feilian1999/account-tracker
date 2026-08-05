<template>
  <RecordSheetLayout
    :modelValue="modelValue"
    :title="editRecordId ? $t('addRecord.title') : $t('home.addRecord')"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <!-- Header Actions (type toggle + close) -->
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
          @click="$emit('update:modelValue', false)"
          class="rounded-full bg-gray-100 !p-1.5 dark:bg-gray-800"
        />
      </div>
    </template>

    <!-- Form Body -->
    <!-- Templates Quick Select -->
    <div
      v-if="!editRecordId && store.recordTemplates.length > 0"
      class="-mx-1 mb-4"
    >
      <div
        class="no-scrollbar flex items-center gap-2 overflow-x-auto px-1 pb-1"
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

    <!-- Fields: Date -> Amount -> Category -> Note -->
    <div class="space-y-4">
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
        <div class="flex flex-1 items-center justify-end gap-1">
          <span class="text-sm font-semibold text-gray-400">NT$</span>
          <input
            ref="amountInput"
            v-model="form.amountStr"
            type="text"
            inputmode="none"
            @focus="showKeyboard = true"
            @keydown.enter.prevent="finishAmountEntry"
            placeholder="0"
            class="w-full bg-transparent text-right text-xl font-bold text-gray-800 caret-violet-500 outline-none dark:text-gray-100"
          />
        </div>
      </div>

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

        <!-- Save as Template -->
        <div v-if="!editRecordId" class="flex items-center gap-2.5 py-1">
          <input
            id="saveAsTemplate"
            v-model="shouldSaveAsTemplate"
            type="checkbox"
            class="h-4 w-4 rounded-md border-2 border-gray-300 text-violet-600 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800"
          />
          <label
            for="saveAsTemplate"
            class="cursor-pointer text-xs font-bold text-gray-500 dark:text-gray-400"
          >
            {{ $t("templates.saveAsTemplate") }}
          </label>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-2">
          <button
            @click="$emit('update:modelValue', false)"
            class="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {{ $t("common.cancel") }}
          </button>
          <BaseButton
            @click="submit"
            :disabled="!isValidAmount"
            :variant="isValidAmount ? 'primary' : 'secondary'"
            class="flex-1 !py-3 shadow-md transition-all sm:text-sm"
          >
            {{ saveButtonText }}
          </BaseButton>
        </div>
      </div>
    </div>
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
import { computed, nextTick, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../../stores/tracker";
import { colorMap } from "../../utils/category";
import CloseButton from "../CloseButton.vue";
import CategoryIcon from "../CategoryIcon.vue";
import CalculatorKeyboard from "../CalculatorKeyboard.vue";
import CategoryPickerSheet from "../CategoryPickerSheet.vue";
import RecordSheetLayout from "../RecordSheetLayout.vue";
import BaseButton from "../BaseButton.vue";
import { getLocalDateString } from "../../utils/date";
import { usePrimaryAction } from "../../composables/usePrimaryAction";

const props = defineProps<{
  modelValue: boolean;
  editRecordId?: string;
  initialTemplateId?: string;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
}>();

const { t } = useI18n();
const store = useTrackerStore();
const today = getLocalDateString();

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

const defaultForm = () => ({
  type: "expense" as "expense" | "income",
  amountStr: "",
  categoryId: expenseCats.value[0]?.id ?? "",
  date: today,
  note: "",
});

const form = ref(defaultForm());
const showKeyboard = ref(false);
const showCategoryPicker = ref(false);
const shouldSaveAsTemplate = ref(false);
const submitting = ref(false);
const amountInput = ref<HTMLInputElement>();

usePrimaryAction(toRef(props, "modelValue"), () => submit(), 1);

watch(
  () => props.modelValue,
  (open) => {
    if (open) nextTick(() => amountInput.value?.focus());
  },
);

const evaluateAmount = () => {
  const str = form.value.amountStr.trim();
  if (!str) return;
  // Evaluate simple math expressions (allow digits, basic operators, parens)
  if (/^[\d+\-*/. ()]+$/.test(str)) {
    try {
      const result = new Function(`return ${str}`)();
      if (isFinite(result) && result > 0) {
        // Keep up to 2 decimals (flooring dropped cents and made <1 unsaveable).
        form.value.amountStr = String(Math.round(result * 100) / 100);
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

const saveButtonText = computed(() => {
  if (!isValidAmount.value) return t("recordSheet.validation.enterAmount");
  return t("common.save");
});

const applyTemplate = (templateId: string) => {
  const t = store.recordTemplates.find((x) => x.id === templateId);
  if (!t) return;

  form.value.type = t.type;
  form.value.categoryId = t.category;
  form.value.amountStr = t.amount !== null ? String(t.amount) : "";
  form.value.note = t.note || "";

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

watch(
  () => form.value.type,
  (newType) => {
    const cats = newType === "expense" ? expenseCats.value : incomeCats.value;
    if (!cats.find((c) => c.id === form.value.categoryId)) {
      form.value.categoryId = cats[0]?.id ?? "";
    }
  },
);

// Reset form or populate from editRecordId/initialTemplateId when sheet opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      shouldSaveAsTemplate.value = false;
      if (props.editRecordId) {
        const r = store.personalRecords.find(
          (x) => x.id === props.editRecordId,
        );
        if (r) {
          // Backward compatibility: Find ID by name if it's an old record or just store name
          const cat = store.allCategories.find(
            (c) => c.name === r.category && c.type === r.type,
          );
          form.value = {
            type: r.type,
            amountStr: String(r.amount),
            categoryId: cat?.id || r.category,
            date: r.date,
            note: r.note,
          };
          return;
        }
      }

      if (props.initialTemplateId) {
        // Reset to defaults first so a stale date/note from a previous session
        // doesn't leak into the templated record.
        form.value = defaultForm();
        applyTemplate(props.initialTemplateId);
        return;
      }

      form.value = defaultForm();
      showKeyboard.value = true;
    } else {
      showKeyboard.value = false;
      showCategoryPicker.value = false;
    }
  },
);

const submit = async () => {
  if (submitting.value) return;
  evaluateAmount();
  const amt = Number(form.value.amountStr);
  if (!amt || isNaN(amt) || amt <= 0) return;
  // Guard against an empty/cleared date, which would crash the Home view's
  // date grouping (parseLocalDateString throws on "").
  if (!form.value.date) return;

  submitting.value = true;
  try {
    const data = {
      type: form.value.type,
      amount: amt,
      category: currentCategoryObj.value?.name || form.value.categoryId,
      date: form.value.date,
      note: form.value.note,
    };

    if (props.editRecordId) {
      await store.updatePersonalRecord(props.editRecordId, data);
    } else {
      await store.addPersonalRecord(data);

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
          note: form.value.note,
        });
      }
    }
    emit("update:modelValue", false);
  } finally {
    submitting.value = false;
  }
};
</script>
