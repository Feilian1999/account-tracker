<template>
  <div
    @click="$emit('click')"
    :class="[
      'cursor-pointer px-4 py-2 border-gray-50 dark:border-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/50 dark:active:bg-gray-700',
      !isLast ? 'border-b' : ''
    ]"
  >
    <div class="flex items-center justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <div
          :class="[
            'record-icon !rounded-full !h-8 !w-8',
            getCategoryStyle(record.category).bg,
            getCategoryStyle(record.category).text,
          ]"
        >
          <CategoryIcon :name="getCategoryStyle(record.category).icon" style="transform: scale(0.85);" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <p class="section-title shrink-0 whitespace-nowrap text-sm">
              {{ getLocalizedCategoryName(record.category) }}
            </p>
            <span v-if="record.note" class="hint-text truncate text-xs min-w-0 before:mr-0.5 before:content-['•']">
              {{ record.note }}
            </span>
          </div>
          <div class="mt-0.5 flex items-center gap-2">
            <span
              v-if="record.sourceBookId"
              class="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-500 dark:bg-violet-900/30 dark:text-violet-400"
            >
              <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              </svg>
              {{ $t("home.fromBook") }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <p
          class="max-w-[100px] truncate font-bold text-right tabular-nums text-gray-800 dark:text-gray-100"
          :title="(record.type === 'expense' ? '-' : '+') + record.amount.toLocaleString()"
        >
          {{ record.type === "expense" ? "-" : "+" }}{{ record.amount.toLocaleString() }}
        </p>
        <button
          @click.stop="$emit('delete')"
          class="btn-delete shrink-0"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useTrackerStore, type PersonalRecord } from "../../stores/tracker";
import { colorMap } from "../../utils/category";
import CategoryIcon from "../CategoryIcon.vue";

defineProps<{
  record: PersonalRecord;
  isLast?: boolean;
}>();

defineEmits<{
  (e: "click"): void;
  (e: "delete"): void;
}>();

const store = useTrackerStore();
const { t, te } = useI18n();

const getCategoryStyle = (categoryName: string) => {
  const cat = store.allCategories.find(c => c.name === categoryName || c.id === categoryName);
  const color = cat?.color ?? "gray";
  return {
    icon: cat?.icon ?? "more_horiz",
    ...(colorMap[color] ?? colorMap.gray),
  };
};

const getLocalizedCategoryName = (categoryName: string) => {
  const cat = store.allCategories.find(c => c.name === categoryName || c.id === categoryName);
  if (cat && te(`categories.${cat.id}`)) return t(`categories.${cat.id}`);
  return categoryName;
};
</script>
