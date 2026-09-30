<template>
  <div v-if="data.length > 0" class="mb-6">
    <h2 class="section-title mb-3">{{ title }}</h2>

    <div
      class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="relative flex">
        <!-- Background Grid -->
        <div class="pointer-events-none absolute inset-x-0 top-8 z-0 flex h-[160px] flex-col justify-between pl-12">
          <div class="w-full border-t border-gray-100 dark:border-gray-700"></div>
          <div class="w-full border-t border-gray-100 dark:border-gray-700"></div>
          <div class="w-full border-t border-gray-100 dark:border-gray-700"></div>
          <div class="w-full border-t border-gray-100 dark:border-gray-700"></div>
        </div>

        <!-- Y-axis labels -->
        <div class="relative z-10 w-12 shrink-0 pt-8">
          <div class="relative h-[160px] w-full">
            <span class="absolute right-2 top-[0%] -translate-y-1/2 text-[10px] text-gray-500">{{ Math.round(maxVal).toLocaleString() }}</span>
            <span class="absolute right-2 top-[33.33%] -translate-y-1/2 text-[10px] text-gray-500">{{ Math.round(maxVal * 2 / 3).toLocaleString() }}</span>
            <span class="absolute right-2 top-[66.67%] -translate-y-1/2 text-[10px] text-gray-500">{{ Math.round(maxVal / 3).toLocaleString() }}</span>
            <span class="absolute right-2 top-[100%] -translate-y-1/2 text-[10px] text-gray-500">0</span>
          </div>
        </div>

        <!-- Scrollable Bars Area -->
        <div class="relative z-10 flex-1 overflow-x-auto pb-4">
          <div
            class="flex pt-8"
            :style="{ minWidth: data.length * 28 + 'px' }"
          >
            <div
              v-for="item in data"
              :key="item.key"
              class="group relative flex flex-1 flex-col items-center border-l border-gray-50/50 dark:border-gray-700/30 first:border-none"
            >
              <div class="relative mx-auto w-full" style="height: 160px">
                <!-- Bar -->
                <div
                  class="absolute bottom-0 left-1/2 w-[14px] -translate-x-1/2 rounded-t-md transition-all duration-500"
                  :class="activeTab === 'expense' ? 'bg-red-400' : 'bg-green-400'"
                  :style="{ height: Math.max(item.percent * 1.6, item.value > 0 ? 2 : 0) + 'px' }"
                ></div>

                <!-- Tooltip -->
                <div
                  v-if="item.value > 0"
                  class="pointer-events-none absolute z-10 whitespace-nowrap text-[10px] font-bold text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-300"
                  :style="{ 
                    bottom: Math.max(item.percent * 1.6, 2) + 'px', 
                    left: '50%', 
                    marginLeft: '8px', 
                    marginBottom: '2px' 
                  }"
                >
                  {{ formatMoney(item.value, currency, locale) }}
                </div>
              </div>

              <!-- X-axis label -->
              <span class="mt-1 block text-center text-[10px] leading-tight text-gray-400">
                {{ item.shortLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="empty-state py-8 text-sm">
    <div class="mb-2 text-3xl">📈</div>
    {{ $t("statistics.noData") }}
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CurrencyCode } from "../../stores/types";
import { formatMoney } from "../../utils/currency";

export interface TrendItem {
  key: string;
  shortLabel: string;
  value: number;
  percent: number;
}

defineProps<{
  title: string;
  data: TrendItem[];
  maxVal: number;
  activeTab: 'expense' | 'income';
  currency: CurrencyCode;
}>();

const { locale } = useI18n();
</script>
