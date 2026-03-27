<template>
  <BaseBottomSheet
    :modelValue="true"
    @update:modelValue="$emit('close')"
    :title="isCreating ? $t('categories.addConfirm') : $t('categories.settingsTitle')"
    maxHeight="h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="flex-1 overflow-y-auto"
  >
    <!-- List View -->
    <div v-if="!isCreating" class="px-4 py-6">
      <!-- Expense -->
      <div class="mb-6">
        <h3 class="mb-3 flex items-center justify-between px-2 text-sm font-bold text-gray-500 dark:text-gray-400">
          {{ $t("common.expense") }}
          <span class="text-xs font-normal text-gray-400 dark:text-gray-500">{{ expenseCats.length }}</span>
        </h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="cat in expenseCats"
            :key="cat.id"
            class="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <div
                :class="[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
                  colorMap[cat.color]?.bg,
                  colorMap[cat.color]?.text,
                ]"
              >
                <CategoryIcon :name="cat.icon" />
              </div>
              <span
                class="truncate text-sm font-bold text-gray-700 dark:text-gray-200"
                >{{ $te(`categories.${cat.id}`) ? $t(`categories.${cat.id}`) : cat.name }}</span
              >
            </div>
            <button
              v-if="!cat.isDefault"
              @click="confirmDeleteCategory(cat.id, cat.name)"
              class="ml-1 shrink-0 p-1 text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
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

      <!-- Income -->
      <div class="mb-6">
        <h3 class="mb-3 flex items-center justify-between px-2 text-sm font-bold text-gray-500 dark:text-gray-400">
          {{ $t("common.income") }}
          <span class="text-xs font-normal text-gray-400 dark:text-gray-500">{{ incomeCats.length }}</span>
        </h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="cat in incomeCats"
            :key="cat.id"
            class="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <div
                :class="[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
                  colorMap[cat.color]?.bg,
                  colorMap[cat.color]?.text,
                ]"
              >
                <CategoryIcon :name="cat.icon" />
              </div>
              <span class="truncate text-sm font-bold text-gray-700 dark:text-gray-200">{{ $te(`categories.${cat.id}`) ? $t(`categories.${cat.id}`) : cat.name }}</span>
            </div>
            <button
              v-if="!cat.isDefault"
              @click="confirmDeleteCategory(cat.id, cat.name)"
              class="ml-1 shrink-0 p-1 text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
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

      <!-- Type -->
      <div class="flex rounded-xl bg-gray-200/60 p-1 transition-colors dark:bg-gray-800">
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
      <BaseButton v-if="!isCreating" class="w-full shadow-lg shadow-blue-500/30" @click="openCreate">
        <span class="mr-1 text-lg">+</span> {{ $t("categories.addCategory") }}
      </BaseButton>
      <BaseButton v-else class="w-full" :disabled="!newForm.name.trim()" @click="saveCustomCategory">
        {{ $t("categories.addConfirm") }}
      </BaseButton>
    </template>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../stores/tracker";
import { colorMapFull as colorMap } from "../utils/category";
import BaseButton from "./BaseButton.vue";
import CategoryIcon from "./CategoryIcon.vue";
import BaseBottomSheet from "./BaseBottomSheet.vue";

const store = useTrackerStore();
const emit = defineEmits(["close"]);
const { t, te } = useI18n();

const isCreating = ref(false);

const expenseCats = computed(() =>
  store.allCategories.filter((c) => c.type === "expense"),
);
const incomeCats = computed(() =>
  store.allCategories.filter((c) => c.type === "income"),
);

const confirmDeleteCategory = (id: string, name: string) => {
  const transName = te(`categories.${id}`) ? t(`categories.${id}`) : name;
  if (confirm(t("categories.deleteConfirm", { name: transName }))) {
    store.deleteCustomCategory(id);
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
  isCreating.value = true;
};

const saveCustomCategory = () => {
  if (!newForm.value.name.trim()) return;
  store.addCustomCategory({
    name: newForm.value.name.trim(),
    type: newForm.value.type,
    color: newForm.value.color,
    icon: newForm.value.icon,
  });
  isCreating.value = false;
};
</script>
