<template>
  <BaseBottomSheet
    :modelValue="true"
    @update:modelValue="$emit('close')"
    :title="mode === 'create' ? $t('categories.addConfirm') : mode === 'edit' ? $t('categories.editTitle') : $t('categories.settingsTitle')"
    maxHeight="h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="flex-1 overflow-y-auto"
  >
    <!-- List View -->
    <div v-if="mode === 'list'" class="px-4 py-6">
      <p class="hint-text mb-4 px-2">{{ $t("categories.tapToEdit") }}</p>
      <div v-for="section in sections" :key="section.type" class="mb-6">
        <h3 class="mb-3 flex items-center justify-between px-2 text-sm font-bold text-gray-500 dark:text-gray-400">
          {{ $t(`common.${section.type}`) }}
          <span class="text-xs font-normal text-gray-400 dark:text-gray-500">{{ section.cats.length }}</span>
        </h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="cat in section.cats"
            :key="cat.id"
            class="flex items-center justify-between rounded-2xl border border-gray-100 bg-white shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800"
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-3 p-3 text-left active:opacity-60"
              @click="openEdit(cat)"
            >
              <span
                :class="[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
                  colorMap[cat.color]?.bg,
                  colorMap[cat.color]?.text,
                ]"
              >
                <CategoryIcon :name="cat.icon" />
              </span>
              <span class="truncate text-sm font-bold text-gray-700 dark:text-gray-200">{{ categoryLabel(cat, t, te) }}</span>
            </button>
            <button
              v-if="!cat.isDefault"
              type="button"
              @click="confirmDeleteCategory(cat)"
              class="mr-2 shrink-0 p-1 text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
              :title="$t('common.delete')"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit View -->
    <div v-else class="space-y-6 px-5 py-6">
      <div class="mb-4">
        <button
          @click="mode = 'list'"
          class="flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ $t('categories.backToList') }}
        </button>
      </div>

      <!-- Type (fixed once created: records of the category carry it) -->
      <div v-if="mode === 'create'" class="flex rounded-xl bg-gray-200/60 p-1 transition-colors dark:bg-gray-800">
        <button
          type="button"
          @click="newForm.type = 'expense'"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-bold transition-all',
            newForm.type === 'expense'
              ? 'bg-white text-red-600 shadow dark:bg-gray-700 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400',
          ]"
        >
          {{ $t("common.expense") }}
        </button>
        <button
          type="button"
          @click="newForm.type = 'income'"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-bold transition-all',
            newForm.type === 'income'
              ? 'bg-white text-green-600 shadow dark:bg-gray-700 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-400',
          ]"
        >
          {{ $t("common.income") }}
        </button>
      </div>

      <!-- Name & Preview -->
      <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        <label class="mb-3 block text-sm font-bold text-gray-700 dark:text-gray-300">{{ $t("common.category") }}</label>
        <div class="flex items-center gap-4">
          <div
            :class="[
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[28px] transition-all duration-300',
              colorMap[newForm.color]?.bg,
              colorMap[newForm.color]?.text,
            ]"
          >
            <CategoryIcon :name="newForm.icon" />
          </div>
          <input
            v-model="newForm.name"
            type="text"
            :placeholder="$t('categories.newCategoryPlaceholder')"
            class="w-full border-b-2 border-gray-200 bg-transparent px-2 py-3 text-lg font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-gray-600 dark:text-gray-100 dark:focus:border-blue-400"
          />
        </div>
        <p v-if="nameTaken" class="mt-2 text-xs font-semibold text-red-500 dark:text-red-400">
          {{ $t("categories.nameTaken") }}
        </p>
        <p v-else-if="mode === 'edit'" class="hint-text mt-2">
          {{ $t("categories.renameNote") }}
        </p>
      </div>

      <!-- Color -->
      <div>
        <label class="mb-3 block text-sm font-bold text-gray-700 dark:text-gray-300">{{ $t('categories.themeColor') }}</label>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="(cls, colorKey) in colorMap"
            :key="colorKey"
            @click="newForm.color = colorKey"
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90',
              cls.bg,
              cls.text,
              newForm.color === colorKey
                ? 'scale-110 ring-4 ring-gray-200'
                : '',
            ]"
          >
            <div v-if="newForm.color === colorKey" class="h-3 w-3 rounded-full bg-current"></div>
          </button>
        </div>
      </div>

      <!-- Icon -->
      <div>
        <label class="mb-3 block text-sm font-bold text-gray-700 dark:text-gray-300">{{ $t('categories.chooseIcon') }}</label>
        <div class="grid grid-cols-6 gap-2 sm:grid-cols-8">
          <button
            v-for="i in iconPalette"
            :key="i"
            @click="newForm.icon = i"
            :class="[
              'flex h-12 w-12 items-center justify-center rounded-2xl text-2xl text-gray-700 transition-all hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700',
              newForm.icon === i
                ? 'scale-110 bg-gray-200 dark:bg-gray-600'
                : 'border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
            ]"
          >
            <CategoryIcon :name="i" />
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton v-if="mode === 'list'" class="w-full shadow-lg shadow-blue-500/30" @click="openCreate">
        <span class="mr-1 text-lg">+</span> {{ $t("categories.addCategory") }}
      </BaseButton>
      <div v-else class="flex gap-3">
        <BaseButton
          v-if="canReset"
          variant="secondary"
          class="w-full"
          @click="resetEditing"
        >
          {{ $t("categories.resetDefault") }}
        </BaseButton>
        <BaseButton class="w-full" :disabled="!canSubmit" @click="submit">
          {{ mode === "create" ? $t("categories.addConfirm") : $t("common.save") }}
        </BaseButton>
      </div>
    </template>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../stores/tracker";
import type { Category } from "../stores/types";
import { defaultCategories } from "../stores/constants";
import { colorMapFull as colorMap } from "../utils/category";
import { categoryLabel, defaultCategoryName } from "../utils/categoryLookup";
import BaseButton from "./BaseButton.vue";
import CategoryIcon from "./CategoryIcon.vue";
import BaseBottomSheet from "./BaseBottomSheet.vue";

const store = useTrackerStore();
const emit = defineEmits(["close"]);
const { t, te } = useI18n();

const mode = ref<"list" | "create" | "edit">("list");
/** The category being edited, as it was when the edit view opened. */
const editing = ref<Category | null>(null);

const sections = computed(() =>
  (["expense", "income"] as const).map((type) => ({
    type,
    cats: store.allCategories.filter((c) => c.type === type),
  })),
);

const confirmDeleteCategory = async (cat: Category) => {
  if (confirm(t("categories.deleteConfirm", { name: categoryLabel(cat, t, te) }))) {
    await store.deleteCustomCategory(cat.id);
  }
};

const iconPalette = [
  "restaurant", "local_cafe", "fastfood", "local_bar", "directions_car", "directions_bus",
  "flight", "local_gas_station", "shopping_bag", "shopping_cart", "checkroom", "chair",
  "sports_esports", "movie", "music_note", "palette", "hotel", "home", "domain", "cottage",
  "attractions", "park", "local_see", "beach_access", "receipt_long", "bolt", "water_drop",
  "wifi", "payments", "savings", "account_balance", "credit_card", "emoji_events",
  "card_giftcard", "redeem", "volunteer_activism", "health_and_safety", "medical_services",
  "pets", "school", "work", "build", "more_horiz", "star",
];

const newForm = ref({
  type: "expense" as "expense" | "income",
  name: "",
  color: "blue",
  icon: "restaurant",
});

const openCreate = () => {
  newForm.value = {
    type: "expense",
    name: "",
    color: "blue",
    icon: "restaurant",
  };
  editing.value = null;
  mode.value = "create";
};

const openEdit = (cat: Category) => {
  // A default category opens under its translated label.
  newForm.value = {
    type: cat.type,
    name: categoryLabel(cat, t, te),
    color: cat.color,
    icon: cat.icon,
  };
  editing.value = { ...cat };
  mode.value = "edit";
};

/**
 * Records find their category by name, so two categories of one type may not
 * share a name — counting what each is shown as and, for a default, the
 * original name its older records still carry.
 */
const nameTaken = computed(() => {
  const name = newForm.value.name.trim();
  if (!name) return false;
  return store.allCategories.some(
    (c) =>
      c.type === newForm.value.type &&
      c.id !== editing.value?.id &&
      [c.name, categoryLabel(c, t, te), defaultCategoryName(c.id)].includes(name),
  );
});

const canSubmit = computed(() => !!newForm.value.name.trim() && !nameTaken.value);

/** A default category that has been renamed or restyled can be restored. */
const canReset = computed(() => {
  const original = defaultCategories.find((c) => c.id === editing.value?.id);
  const current = store.allCategories.find((c) => c.id === original?.id);
  return (
    !!original &&
    !!current &&
    (["name", "icon", "color"] as const).some((k) => current[k] !== original[k])
  );
});

const submit = async () => {
  if (!canSubmit.value) return;
  const name = newForm.value.name.trim();
  if (mode.value === "create") {
    await store.addCustomCategory({
      name,
      type: newForm.value.type,
      color: newForm.value.color,
      icon: newForm.value.icon,
    });
  } else if (editing.value) {
    const cat = editing.value;
    await store.updateCategory(cat.id, {
      // An untouched translated label keeps the stored name.
      name: name === categoryLabel(cat, t, te) ? cat.name : name,
      color: newForm.value.color,
      icon: newForm.value.icon,
    });
  }
  mode.value = "list";
};

const resetEditing = async () => {
  if (!editing.value) return;
  await store.resetDefaultCategory(editing.value.id);
  mode.value = "list";
};
</script>
