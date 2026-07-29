<template>
  <!-- LIST VIEW: standard bottom sheet -->
  <BaseBottomSheet
    v-if="!isCreating"
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="$t('templates.title')"
    maxHeight="h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="flex-1 overflow-y-auto"
  >
    <!-- List of templates -->
    <div class="space-y-3 px-4 py-6">
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

    <template #footer>
      <BaseButton class="w-full shadow-lg shadow-blue-500/30" @click="openCreate">
        <span class="mr-1 text-lg">+</span> {{ $t("templates.addTemplate") }}
      </BaseButton>
    </template>
  </BaseBottomSheet>

  <!-- CREATE / EDIT VIEW: dual-layer layout matching AddPersonalRecordSheet -->
  <RecordSheetLayout
    v-else
    :modelValue="modelValue"
    :title="editingId ? $t('templates.editTemplate') : $t('templates.addTemplate')"
    @update:modelValue="onClose"
  >
    <!-- Header Actions -->
    <template #header-actions>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="newForm.type = newForm.type === 'expense' ? 'income' : 'expense'; resetCategory()"
          class="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800 active:scale-95 transition-transform"
        >
          <div
            :class="['px-2.5 py-1 text-xs font-bold rounded-md transition-all', newForm.type === 'expense' ? 'bg-white text-red-700 shadow-sm dark:bg-gray-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400']"
          >{{ $t("common.expense") }}</div>
          <div
            :class="['px-2.5 py-1 text-xs font-bold rounded-md transition-all', newForm.type === 'income' ? 'bg-white text-emerald-700 shadow-sm dark:bg-gray-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400']"
          >{{ $t("common.income") }}</div>
        </button>
        <CloseButton @click="onClose(false)" class="!p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>
    </template>

    <!-- Form Body -->
    <!-- Template Name -->
    <div class="space-y-4">
      <div class="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-2">
        <span class="material-symbols-outlined text-gray-400 text-xl">label</span>
        <label class="text-sm font-semibold text-gray-600 dark:text-gray-400 w-16 shrink-0">{{ $t("templates.templateName") }}</label>
        <input
          v-model="newForm.name"
          type="text"
          :placeholder="$t('templates.namePlaceholder')"
          class="flex-1 bg-transparent text-right font-bold text-gray-800 dark:text-gray-200 outline-none w-full"
        />
      </div>

      <!-- Category — opens the picker -->
      <button
        type="button"
        class="flex w-full items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-2 text-left transition-opacity active:opacity-60"
        @click="showCategoryPicker = true"
      >
        <span class="material-symbols-outlined text-gray-400 text-xl">category</span>
        <span class="text-sm font-semibold text-gray-600 dark:text-gray-400 w-16 shrink-0">{{ $t("common.category") }}</span>
        <span class="flex-1 flex items-center justify-end gap-2">
          <span class="text-sm font-bold" :class="newForm.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">
            {{ selectedCategoryObj ? ($te('categories.' + selectedCategoryObj.id) ? $t('categories.' + selectedCategoryObj.id) : selectedCategoryObj.name) : $t('common.select') }}
          </span>
          <span v-if="selectedCategoryObj" class="flex h-6 w-6 items-center justify-center rounded-[6px] text-white shadow-sm" :class="newForm.type === 'expense' ? 'bg-red-600' : 'bg-emerald-600'">
            <CategoryIcon :name="selectedCategoryObj.icon" class="text-[14px]" />
          </span>
          <span class="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
        </span>
      </button>

      <!-- Amount (optional) -->
      <div class="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-2">
        <span class="material-symbols-outlined text-gray-400 text-xl">attach_money</span>
        <label class="text-sm font-semibold text-gray-600 dark:text-gray-400 w-16 shrink-0">{{ $t("templates.amountOptional") }}</label>
        <div class="flex-1 flex items-center justify-end gap-1">
          <span class="text-gray-400 font-semibold text-sm">NT$</span>
          <input
            v-model="amountStr"
            type="number"
            :placeholder="$t('templates.amountPlaceholder')"
            class="w-full bg-transparent text-right text-xl font-bold text-gray-800 outline-none dark:text-gray-100"
          />
        </div>
      </div>

      <!-- Note (optional) -->
      <div class="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
        <span class="material-symbols-outlined text-gray-400 text-xl">edit_note</span>
        <label class="text-sm font-semibold text-gray-600 dark:text-gray-400 w-16 shrink-0">{{ $t("templates.noteOptional") }}</label>
        <input
          v-model="newForm.note"
          type="text"
          class="flex-1 bg-transparent text-right font-medium text-gray-800 dark:text-gray-200 outline-none w-full"
        />
      </div>

      <!-- Save Button -->
      <div class="flex gap-3 pt-2">
        <button
          @click="onClose(false)"
          class="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {{ $t("common.cancel") }}
        </button>
        <button
          @click="saveTemplate"
          :disabled="!isFormValid"
          class="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 shadow-md shadow-violet-500/20"
        >
          {{ $t("templates.saveTemplate") }}
        </button>
      </div>
    </div>
  </RecordSheetLayout>

  <CategoryPickerSheet
    v-model="showCategoryPicker"
    :categories="availableCategories"
    :selectedId="newForm.category"
    :type="newForm.type"
    @select="newForm.category = $event"
  />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore, type RecordTemplate } from "../stores/tracker";
import { colorMapFull as colorMap } from "../utils/category";
import BaseButton from "./BaseButton.vue";
import CategoryIcon from "./CategoryIcon.vue";
import BaseBottomSheet from "./BaseBottomSheet.vue";
import CategoryPickerSheet from "./CategoryPickerSheet.vue";
import RecordSheetLayout from "./RecordSheetLayout.vue";
import CloseButton from "./CloseButton.vue";

const store = useTrackerStore();
defineProps({
  modelValue: Boolean,
});
const emit = defineEmits(["update:modelValue"]);
const { t } = useI18n();

const isCreating = ref(false);
const editingId = ref<string | null>(null);
const showCategoryPicker = ref(false);

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

const selectedCategoryObj = computed(() =>
  availableCategories.value.find((c) => c.id === newForm.value.category)
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

const deleteTemplate = async (id: string, name: string) => {
  if (confirm(t("templates.deleteConfirm", { name }))) {
    await store.deleteTemplate(id);
  }
};

const openCreate = () => {
  editingId.value = null;
  newForm.value = { type: "expense", name: "", category: "", note: "" };
  amountStr.value = "";
  resetCategory();
  isCreating.value = true;
};

const openEdit = (tpl: RecordTemplate) => {
  editingId.value = tpl.id;
  newForm.value = { type: tpl.type, name: tpl.name, category: tpl.category, note: tpl.note };
  amountStr.value = tpl.amount !== null ? String(tpl.amount) : "";
  isCreating.value = true;
};

const resetCategory = () => {
  const cats = availableCategories.value;
  if (cats.length > 0) newForm.value.category = cats[0].id;
  else newForm.value.category = "";
};

const onClose = (val: boolean) => {
  if (!val) showCategoryPicker.value = false;
  if (!val && isCreating.value) {
    // In the create/edit view, closing should return to the template list
    // rather than dismissing the whole modal and losing that context.
    isCreating.value = false;
    return;
  }
  emit("update:modelValue", val);
};

const saveTemplate = async () => {
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
    await store.updateTemplate(editingId.value, data);
  } else {
    await store.addTemplate(data);
  }
  isCreating.value = false;
};
</script>
