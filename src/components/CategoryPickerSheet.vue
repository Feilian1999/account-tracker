<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    :title="$t('categoryPicker.title')"
    maxHeight="max-h-[70vh]"
    contentClass="px-4 py-5"
    zClass="z-60"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <p
      v-if="categories.length === 0"
      class="py-10 text-center text-sm font-medium text-gray-400 dark:text-gray-500"
    >
      {{ $t("categoryPicker.empty") }}
    </p>

    <div v-else class="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        :aria-pressed="cat.id === selectedId"
        class="flex flex-col items-center gap-1.5 rounded-2xl py-1 transition-transform active:scale-95"
        @click="choose(cat.id)"
      >
        <div
          class="flex h-14 w-14 items-center justify-center rounded-2xl text-[24px] transition-colors"
          :class="
            cat.id === selectedId
              ? type === 'expense'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          "
        >
          <CategoryIcon :name="cat.icon" />
        </div>
        <span
          class="text-center text-xs leading-tight font-bold"
          :class="
            cat.id === selectedId
              ? type === 'expense'
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
              : 'text-gray-600 dark:text-gray-400'
          "
        >
          {{
            $te(`categories.${cat.id}`) ? $t(`categories.${cat.id}`) : cat.name
          }}
        </span>
      </button>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from "./BaseBottomSheet.vue";
import CategoryIcon from "./CategoryIcon.vue";
import type { Category } from "../stores/types";

/**
 * Category chooser for the record/template sheets.
 *
 * The grid used to sit in the dimmed backdrop above the record sheet, which the
 * sheet could grow to cover almost entirely, and a mis-tap there dismissed the
 * whole sheet. Picking now happens in its own overlay stacked above the sheet.
 */
defineProps<{
  modelValue: boolean;
  categories: Category[];
  selectedId: string;
  type: "expense" | "income";
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  select: [categoryId: string];
}>();

const choose = (categoryId: string) => {
  emit("select", categoryId);
  emit("update:modelValue", false);
};
</script>
