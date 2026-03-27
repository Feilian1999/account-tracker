<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-end justify-center"
      @click.self="close"
    >
      <div class="sheet-backdrop" @click="close"></div>
      <div
        class="animate-slide-up relative flex max-h-[90vh] w-full max-w-md flex-col rounded-t-[2rem] bg-white shadow-2xl transition-colors dark:bg-gray-900"
      >
        <!-- Header -->
        <div
          class="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 transition-colors dark:border-gray-800"
        >
          <div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">
              {{ $t("recordSheet.title") }}
            </h2>
            <p class="hint-text mt-0.5">{{ $t("recordSheet.subtitle", { name: bookName }) }}</p>
          </div>
          <CloseButton @click="close" />
        </div>

        <!-- Body Form -->
        <form
          @submit.prevent="handleSubmit"
          class="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-6 py-6"
        >
          <!-- Templates Quick Select -->
          <div v-if="!editRecordId && store.recordTemplates.length > 0" class="-mx-1 mb-2">
            <div class="flex items-center gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
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
                  <CategoryIcon :name="getTemplateIcon(tpl.category)" style="transform: scale(0.6);" />
                </div>
                {{ tpl.name }}
              </button>
            </div>
          </div>

          <!-- Type toggle -->
          <div class="type-toggle-track">
            <button
              type="button"
              @click="form.type = 'expense'"
              :class="[
                'type-toggle-btn',
                form.type === 'expense'
                  ? 'type-toggle-btn--active-expense'
                  : 'type-toggle-btn--inactive',
              ]"
            >
              {{ $t("common.expense") }}
            </button>
            <button
              type="button"
              @click="form.type = 'income'"
              :class="[
                'type-toggle-btn',
                form.type === 'income'
                  ? 'type-toggle-btn--active-income'
                  : 'type-toggle-btn--inactive',
              ]"
            >
              {{ $t("common.income") }}
            </button>
          </div>

          <!-- Amount -->
          <div class="relative">
            <span
              class="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-gray-400 dark:text-gray-500"
              >NT$</span
            >
            <input
              v-model="form.amountStr"
              type="text"
              inputmode="none"
              @focus="showKeyboard = true"
              required
              :placeholder="$t('common.amount')"
              class="input-field pl-14 text-base font-semibold caret-violet-500 selection:bg-violet-100 dark:selection:bg-violet-900/40"
            />
          </div>

          <CalculatorKeyboard 
            v-if="showKeyboard"
            v-model="form.amountStr"
            @submit="showKeyboard = false"
            class="mt-2"
          />

          <div v-show="!showKeyboard" class="space-y-5">
            <!-- Category Grid -->
            <div>
            <label class="label-text !text-xs">{{ $t("common.category") }}</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="cat in activeCats"
                :key="cat.id"
                @click="form.category = cat.name"
                type="button"
                :class="[
                  'cat-btn',
                  form.category === cat.name
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-500 dark:bg-blue-900/40 dark:text-blue-400 dark:ring-blue-400'
                    : 'border border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                ]"
              >
                <CategoryIcon :name="cat.icon" class="mb-1 text-[28px]" />
                <span
                  class="w-full truncate px-1 text-center text-xs font-medium"
                  >{{ $t(`categories.${cat.id}`) || cat.name }}</span
                >
              </button>
            </div>
          </div>

            <!-- Date & Note Grouped -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label-text !text-xs">{{ $t("common.date") }}</label>
                <input
                  v-model="form.date"
                  type="date"
                  required
                  class="input-field !py-2 text-sm"
                />
              </div>
              <div class="flex flex-col">
                <label class="label-text !text-xs">{{ $t("common.note") }}</label>
                <input
                  v-model="form.note"
                  type="text"
                  :placeholder="$t('common.note')"
                  class="input-field !py-2 text-sm"
                />
              </div>
            </div>

          <!-- Paid By -->
          <div v-if="form.type === 'expense'" class="pt-2">
            <label class="label-text !text-xs">{{ $t("recordSheet.paidBy") }}</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="m in members"
                :key="'paid-' + m.id"
                type="button"
                @click="form.paidById = m.id"
                :class="[
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                  form.paidById === m.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                ]"
              >
                {{ m.name }}
              </button>
            </div>
          </div>

          <!-- Split Among -->
          <div
            v-if="form.type === 'expense'"
            class="rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors dark:border-gray-700 dark:bg-gray-800/80"
          >
            <div class="mb-2 flex items-center justify-between">
              <label
                class="text-xs font-semibold text-gray-500 dark:text-gray-400"
                >{{ $t("recordSheet.splitAmong") }}</label
              >
              <button
                type="button"
                @click="toggleAll"
                class="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {{
                  form.splitAmongIds.length === members.length
                    ? $t("recordSheet.unselectAll")
                    : $t("recordSheet.selectAll")
                }}
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="m in members"
                :key="m.id"
                type="button"
                @click="toggleMember(m.id)"
                :class="[
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                  form.splitAmongIds.includes(m.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
                ]"
              >
                {{ m.name }}
              </button>
            </div>
            <p
              v-if="form.splitAmongIds.length > 0 && isValidAmount"
              class="mt-2 text-right text-xs font-medium text-blue-600 dark:text-blue-400"
            >
              {{
                $t("recordSheet.splitPerPerson", {
                  amount: Math.floor(
                    Number(form.amountStr) / form.splitAmongIds.length,
                  ).toLocaleString(),
                })
              }}
            </p>
          </div>

          <!-- Save as Template -->
          <div v-if="!editRecordId" class="flex items-center gap-2.5 px-2 py-1">
            <input
              id="saveAsTemplate"
              v-model="shouldSaveAsTemplate"
              type="checkbox"
              class="h-4.5 w-4.5 rounded-lg border-2 border-gray-200 text-blue-600 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800"
            />
            <label for="saveAsTemplate" class="cursor-pointer text-xs font-bold text-gray-500 dark:text-gray-400">
              {{ $t("templates.saveAsTemplate") }}
            </label>
          </div>

          <BaseButton
          type="submit"
            :disabled="
              !isValidAmount || (form.type === 'expense' && form.splitAmongIds.length === 0)
            "
            class="mt-2 w-full"
          >
            {{ $t("common.save") }}
          </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useTrackerStore } from "../../stores/tracker";
import type { Member } from "../../stores/tracker";
import { colorMap } from "../../utils/category";
import BaseButton from "../BaseButton.vue";
import CloseButton from "../CloseButton.vue";
import CategoryIcon from "../CategoryIcon.vue";
import CalculatorKeyboard from "../CalculatorKeyboard.vue";

const props = defineProps<{
  modelValue: boolean;
  bookName: string;
  members: Member[];
  editRecordId?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const store = useTrackerStore();
const today = new Date().toISOString().split("T")[0];

const defaultForm = () => ({
  type: "expense" as "expense" | "income",
  amountStr: "",
  category: "",
  paidById: props.members[0]?.id ?? "",
  splitAmongIds: props.members.map((m) => m.id),
  date: today,
  note: "",
});

const form = ref(defaultForm());
const showKeyboard = ref(false);
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

const evaluateAmount = () => {
  const str = form.value.amountStr.trim();
  if (!str) return;
  if (/^[\d+\-*/. ()]+$/.test(str)) {
    try {
      const result = new Function(`return ${str}`)();
      if (!isNaN(result) && result > 0) {
        form.value.amountStr = String(Math.floor(result));
      }
    } catch {
      // ignore
    }
  }
};

const isValidAmount = computed(() => {
  const v = Number(form.value.amountStr);
  return !isNaN(v) && v > 0;
});

const applyTemplate = (templateId: string) => {
  const t = store.recordTemplates.find((x) => x.id === templateId);
  if (!t) return;
  
  const catName = store.allCategories.find((c) => c.id === t.category)?.name ?? t.category;
  form.value.type = t.type;
  form.value.category = catName;
  form.value.amountStr = t.amount !== null ? String(t.amount) : "";
  form.value.note = t.note || "";
  
  if (t.amount === null) {
    showKeyboard.value = true;
  }
};

const getTemplateIcon = (categoryId: string) => {
  return store.allCategories.find((c) => c.id === categoryId)?.icon ?? "more_horiz";
};

const getTemplateColorClass = (categoryId: string) => {
  const color = store.allCategories.find((c) => c.id === categoryId)?.color ?? "gray";
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
        const r = store.records.find(x => x.id === props.editRecordId);
        if (r) {
          form.value = {
            type: r.type,
            amountStr: String(r.amount),
            category: r.category,
            paidById: r.paidById,
            splitAmongIds: [...r.splitAmongIds],
            date: r.date,
            note: r.note,
          };
          return;
        }
      }
      const reset = defaultForm();
      reset.category = expenseCats.value[0]?.name ?? "";
      form.value = reset;
      showKeyboard.value = true;
    } else {
      showKeyboard.value = false;
    }
  },
);

watch(
  () => form.value.type,
  (newType) => {
    const cats = newType === "expense" ? expenseCats.value : incomeCats.value;
    if (!cats.find((c) => c.name === form.value.category)) {
      form.value.category = cats[0]?.name ?? "";
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

const handleSubmit = () => {
  evaluateAmount();
  const amt = Number(form.value.amountStr);
  if (!amt || isNaN(amt) || amt <= 0) return;
  const isExpense = form.value.type === "expense";
  if (isExpense && form.value.splitAmongIds.length === 0) return;

  const data = {
    type: form.value.type,
    amount: amt,
    category: form.value.category,
    date: form.value.date,
    note: form.value.note,
    paidById: isExpense ? form.value.paidById : "",
    splitAmongIds: isExpense ? form.value.splitAmongIds : [],
  };

  if (props.editRecordId) {
    store.updateRecord(props.editRecordId, data);
  } else {
    store.addRecord(data);
    
    // Save as template if requested
    if (shouldSaveAsTemplate.value) {
      const catId = store.allCategories.find(c => c.name === form.value.category)?.id ?? form.value.category;
      store.addTemplate({
        name: form.value.note || form.value.category,
        type: form.value.type,
        category: catId,
        amount: amt,
        note: form.value.note,
      });
    }
  }
  close();
};
</script>
