<template>
  <div>
    <!-- Date Title Section -->
    <div class="mb-2 flex items-center justify-between px-2 text-sm font-bold text-gray-500 dark:text-gray-400">
      <h3>{{ formatDateWithWeekday(dateGroup, locale) }}</h3>
      <span v-if="getGroupExpense(records) > 0" class="text-xs font-medium opacity-80">
        {{ $t('common.expense') }} ${{ getGroupExpense(records).toLocaleString() }}
      </span>
    </div>
    
    <!-- Grouped Records Block -->
    <div class="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <RecordItem
        v-for="(record, index) in records"
        :key="record.id"
        :record="record"
        :is-last="index === records.length - 1"
        @click="$emit('edit', record.id)"
        @delete="$emit('delete', record.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PersonalRecord } from "../../stores/tracker";
import { formatDateWithWeekday } from "../../utils/category";
import RecordItem from "./RecordItem.vue";

defineProps<{
  dateGroup: string;
  records: PersonalRecord[];
}>();

defineEmits<{
  (e: "edit", id: string): void;
  (e: "delete", id: string): void;
}>();

const { locale } = useI18n();

const getGroupExpense = (records: PersonalRecord[]) => {
  return records.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
};
</script>
