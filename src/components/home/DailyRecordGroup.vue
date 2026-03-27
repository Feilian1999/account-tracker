<template>
  <section :aria-labelledby="headingId">
    <header class="mb-2 flex items-center justify-between px-2 text-sm font-bold text-gray-500 dark:text-gray-400">
      <h3 :id="headingId">{{ formatDateWithWeekday(dateGroup, locale) }}</h3>
      <span v-if="getGroupExpense(records) > 0" class="text-xs font-medium opacity-80">
        {{ $t("common.expense") }} ${{ getGroupExpense(records).toLocaleString() }}
      </span>
    </header>

    <ul class="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <li v-for="(record, index) in records" :key="record.id">
        <RecordItem
          :record="record"
          :is-last="index === records.length - 1"
          @click="$emit('edit', record.id)"
          @delete="$emit('delete', record.id)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PersonalRecord } from "../../stores/tracker";
import { formatDateWithWeekday } from "../../utils/category";
import RecordItem from "./RecordItem.vue";

const props = defineProps<{
  dateGroup: string;
  records: PersonalRecord[];
}>();

defineEmits<{
  (e: "edit", id: string): void;
  (e: "delete", id: string): void;
}>();

const { locale } = useI18n();
const headingId = computed(() => `record-group-${props.dateGroup}`);

const getGroupExpense = (records: PersonalRecord[]) => records.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
</script>
