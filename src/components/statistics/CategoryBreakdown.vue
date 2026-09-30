<template>
  <div class="mb-6">
    <h2 class="section-title mb-3">{{ $t("statistics.categoryBreakdown") }}</h2>

    <div v-if="data.length === 0" class="empty-state py-8 text-sm">
      <div class="mb-2 text-3xl">🔍</div>
      {{ $t("statistics.noData") }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="item in data"
        :key="item.categoryName"
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              :class="[
                'record-icon',
                item.style.bg,
                item.style.text,
              ]"
            >
              <CategoryIcon :name="item.style.icon" />
            </div>
            <div>
              <p class="text-sm font-bold text-gray-800 dark:text-gray-200">
                {{ item.localizedName }}
              </p>
              <p class="hint-text mt-0.5">
                {{ item.count }} {{ $t("statistics.records") }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p
              :class="[
                'font-bold',
                activeTab === 'expense' ? 'text-red-500' : 'text-green-500',
              ]"
            >
              {{ formatMoney(item.total, currency, locale) }}
            </p>
            <p class="hint-text mt-0.5">{{ item.percentage }}%</p>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="activeTab === 'expense' ? 'bg-red-400' : 'bg-green-400'"
            :style="{ width: item.percentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- Total row -->
      <div class="flex items-center justify-between rounded-2xl bg-gray-100 p-4 font-bold dark:bg-gray-800">
        <span class="text-gray-600 dark:text-gray-300">{{ $t("statistics.total") }}</span>
        <span :class="activeTab === 'expense' ? 'text-red-500' : 'text-green-500'">
          {{ formatMoney(total, currency, locale) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import CategoryIcon from "../CategoryIcon.vue";
import type { CurrencyCode } from "../../stores/types";
import { formatMoney } from "../../utils/currency";

export interface CategoryBreakdownItem {
  categoryName: string;
  localizedName: string;
  total: number;
  count: number;
  percentage: number;
  style: {
    icon: string;
    bg: string;
    text: string;
  };
}

defineProps<{
  data: CategoryBreakdownItem[];
  total: number;
  activeTab: 'expense' | 'income';
  currency: CurrencyCode;
}>();

const { locale } = useI18n();
</script>
