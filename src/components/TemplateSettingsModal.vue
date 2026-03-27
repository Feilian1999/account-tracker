<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="isCreating ? (editingId ? $t('templates.editTemplate') : $t('templates.addTemplate')) : $t('templates.title')"
    maxHeight="h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="flex-1 overflow-y-auto"
  >
    <!-- List View -->
    <div v-if="!isCreating" class="space-y-3 px-4 py-6">
      <div v-if="store.recordTemplates.length === 0" class="py-10 text-center text-sm text-gray-400">
        {{ $t("templates.noTemplates") }}
      </div>

      <div
        v-for="tpl in store.recordTemplates"
        :key="tpl.id"
        class="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800"
        @click="openEdit(tpl)"
      >
        <div class="flex flex-1 items-center gap-4 overflow-hidden">
          <div
            :class="[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
              colorMap[getCategoryColor(tpl.category)]?.bg,
              colorMap[getCategoryColor(tpl.category)]?.text,
            ]"
          >
            <CategoryIcon :name="getCategoryIcon(tpl.category)" />
          </div>
          <div class="flex-1 overflow-hidden">
            <div class="flex items-center gap-2">
              <span class="truncate text-base font-bold text-gray-800 dark:text-gray-100">{{ tpl.name }}</span>
              <span :class="tpl.type === 'expense' ? 'text-red-500' : 'text-green-500'" class="text-xs font-bold">
                {{ tpl.type === 'expense' ? $t("templates.typeExpense") : $t("templates.typeIncome") }}
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <div class="flex items-center gap-1.5 font-bold tabular-nums">
                <span v-if="tpl.amount">{{ Math.round(tpl.amount).toLocaleString() }}</span>
                <span v-else class="italic opacity-60 text-[11px] font-normal">{{ $t("templates.variableAmount") }}</span>
              </div>
              <span v-if="tpl.note" class="max-w-[120px] truncate text-xs opacity-60 before:mr-1.5 before:content-['•']">{{ tpl.note }}</span>
            </div>
          </div>
        </div>

        <button
          @click.stop="deleteTemplate(tpl.id, tpl.name)"
          class="ml-2 shrink-0 p-2 text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Create View -->
    <div v-else class="space-y-6 px-5 py-6">
      <div class="mb-4">
        <button
          @click="isCreating = false"
          class="flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ $t('categories.backToList') }}
        </button>
      </div>

      <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        <label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">{{ $t("templates.templateName") }}</label>
        <input
          v-model="newForm.name"
          type="text"
          :placeholder="$t('templates.namePlaceholder')"
          class="w-full border-b-2 border-gray-200 bg-transparent px-2 py-2 text-lg font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      <div class="flex rounded-xl bg-gray-200/60 p-1 transition-colors dark:bg-gray-800">
        <button
          type="button"
          @click="newForm.type = 'expense'; resetCategory()"
          :class="['flex-1 rounded-lg py-2 text-sm font-bold transition-all', newForm.type === 'expense' ? 'bg-white text-red-600 shadow' : 'text-gray-500']"
        >
          {{ $t("common.expense") }}
        </button>
        <button
          type="button"
          @click="newForm.type = 'income'; resetCategory()"
          :class="['flex-1 rounded-lg py-2 text-sm font-bold transition-all', newForm.type === 'income' ? 'bg-white text-green-600 shadow' : 'text-gray-500']"
        >
          {{ $t("common.income") }}
        </button>
      </div>

      <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        <label class="mb-3 block text-sm font-bold text-gray-700 dark:text-gray-300">{{ $t('common.category') }}</label>
        <div class="grid grid-cols-4 gap-3">
          <button
            v-for="cat in availableCategories"
            :key="cat.id"
            @click="newForm.category = cat.id"
            :class="[
              'flex flex-col items-center gap-1.5 rounded-xl p-2 transition-transform active:scale-95',
              newForm.category === cat.id ? 'bg-gray-50 shadow-sm ring-2 ring-blue-500 dark:bg-gray-700/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            ]"
          >
            <div :class="['flex h-10 w-10 items-center justify-center rounded-xl text-xl', colorMap[cat.color]?.bg, colorMap[cat.color]?.text]">
              <CategoryIcon :name="cat.icon" />
            </div>
            <span class="truncate text-[11px] font-medium text-gray-600 dark:text-gray-300 w-full text-center">{{ $te('categories.' + cat.id) ? $t('categories.' + cat.id) : cat.name }}</span>
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        <label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">{{ $t("templates.amountOptional") }}</label>
        <input
          v-model="amountStr"
          type="number"
          :placeholder="$t('templates.amountPlaceholder')"
          class="w-full border-b-2 border-gray-200 bg-transparent px-2 py-2 text-lg font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        <label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">{{ $t("templates.noteOptional") }}</label>
        <input
          v-model="newForm.note"
          type="text"
          class="w-full border-b-2 border-gray-200 bg-transparent px-2 py-2 text-lg text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-gray-600 dark:text-gray-100"
        />
      </div>
    </div>

    <template #footer>
      <BaseButton v-if="!isCreating" class="w-full shadow-lg shadow-blue-500/30" @click="openCreate">
        <span class="mr-1 text-lg">+</span> {{ $t("templates.addTemplate") }}
      </BaseButton>
      <BaseButton v-else class="w-full" :disabled="!isFormValid" @click="saveTemplate">
        {{ $t("templates.saveTemplate") }}
      </BaseButton>
    </template>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore, type RecordTemplate } from "../stores/tracker";
import { colorMapFull as colorMap } from "../utils/category";
import BaseButton from "./BaseButton.vue";
import CategoryIcon from "./CategoryIcon.vue";
import BaseBottomSheet from "./BaseBottomSheet.vue";

const store = useTrackerStore();
defineProps({
  modelValue: Boolean,
});
const emit = defineEmits(["update:modelValue"]);
const { t } = useI18n();

const isCreating = ref(false);
const editingId = ref<string | null>(null);

const amountStr = ref("");
const newForm = ref({
  type: "expense" as "expense" | "income",
  name: "",
  category: "",
  note: "",
});

const availableCategories = computed(() =>
  store.allCategories.filter((c) => c.type === newForm.value.type)
);

const isFormValid = computed(() => {
  return (newForm.value.name || '').trim() !== "" && newForm.value.category !== "";
});

function getCategoryColor(id: string) {
  return store.allCategories.find((c) => c.id === id)?.color || "gray";
}
function getCategoryIcon(id: string) {
  return store.allCategories.find((c) => c.id === id)?.icon || "more_horiz";
}

const deleteTemplate = (id: string, name: string) => {
  if (confirm(t("templates.deleteConfirm", { name }))) {
    store.deleteTemplate(id);
  }
};

const openCreate = () => {
  editingId.value = null;
  newForm.value = {
    type: "expense",
    name: "",
    category: "",
    note: "",
  };
  amountStr.value = "";
  resetCategory();
  isCreating.value = true;
};

const openEdit = (tpl: RecordTemplate) => {
  editingId.value = tpl.id;
  newForm.value = {
    type: tpl.type,
    name: tpl.name,
    category: tpl.category,
    note: tpl.note,
  };
  amountStr.value = tpl.amount !== null ? String(tpl.amount) : "";
  isCreating.value = true;
};

const resetCategory = () => {
  const cats = availableCategories.value;
  if (cats.length > 0) newForm.value.category = cats[0].id;
  else newForm.value.category = "";
};

const saveTemplate = () => {
  if (!isFormValid.value) return;
  
  const rawAmount = String(amountStr.value).trim();
  const numAmount = rawAmount === "" ? null : parseFloat(rawAmount);
  
  const data = {
    name: newForm.value.name.trim(),
    type: newForm.value.type,
    category: newForm.value.category,
    amount: (numAmount !== null && !isNaN(numAmount) && numAmount > 0) ? numAmount : null,
    note: newForm.value.note.trim(),
  };

  if (editingId.value) {
    store.updateTemplate(editingId.value, data);
  } else {
    store.addTemplate(data);
  }
  isCreating.value = false;
};
</script>
