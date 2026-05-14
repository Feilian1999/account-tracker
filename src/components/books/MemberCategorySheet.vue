<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="member.name"
    :subtitle="$t('settlementSheet.memberCategoryTitle')"
    maxHeight="max-h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="px-4 py-6"
  >
    <div
      v-if="categoryItems.length === 0"
      class="flex flex-col items-center justify-center py-16"
    >
      <div
        class="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-3xl dark:bg-gray-800"
      >
        <CategoryIcon name="receipt_long" class="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p class="text-sm font-medium text-gray-400 dark:text-gray-500">
        {{ $t("settlementSheet.noExpense") }}
      </p>
    </div>
    <CategoryBreakdown
      v-else
      :data="categoryItems"
      :total="total"
      activeTab="expense"
    />
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from "../BaseBottomSheet.vue";
import CategoryBreakdown from "../statistics/CategoryBreakdown.vue";
import CategoryIcon from "../CategoryIcon.vue";
import type { CategoryBreakdownItem } from "../statistics/CategoryBreakdown.vue";
import type { Member } from "../../stores/types";

defineProps<{
  modelValue: boolean;
  member: Member;
  categoryItems: CategoryBreakdownItem[];
  total: number;
}>();

defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>
