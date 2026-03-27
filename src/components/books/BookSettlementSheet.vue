<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="$t('settlementSheet.title')"
    :subtitle="bookName"
    maxHeight="max-h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="px-4 py-6"
  >
    <div class="space-y-6">
      <!-- Member Stats -->
      <div>
        <h3
          class="mb-3 px-2 text-sm font-bold text-gray-500 dark:text-gray-400"
        >
          {{ $t("settlementSheet.memberDetailStats") }}
        </h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="stat in memberStats"
            :key="stat.member.id"
            class="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-800"
          >
            <div class="mb-3 flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
              >
                {{ stat.member.name.charAt(0) }}
              </div>
              <span class="font-bold text-gray-800 dark:text-gray-200">{{
                stat.member.name
              }}</span>
            </div>
            <div
              class="flex gap-2 divide-x divide-gray-100 rounded-xl bg-gray-50 p-2 dark:divide-gray-700 dark:bg-gray-900/50"
            >
              <div class="flex-1 text-center">
                <p
                  class="text-[10px] font-bold text-gray-400 dark:text-gray-500"
                >
                  {{ $t("settlementSheet.paid") }}
                </p>
                <p
                  class="mt-0.5 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                  {{ stat.paid.toLocaleString() }}
                </p>
              </div>
              <div class="flex-1 text-center">
                <p
                  class="text-[10px] font-bold text-gray-400 dark:text-gray-500"
                >
                  {{ $t("settlementSheet.owed") }}
                </p>
                <p
                  class="mt-0.5 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                  {{ stat.owed.toLocaleString() }}
                </p>
              </div>
              <div class="flex-1 text-center">
                <p
                  class="text-[10px] font-bold text-gray-400 dark:text-gray-500"
                >
                  {{ $t("settlementSheet.balance") }}
                </p>
                <p
                  :class="[
                    'mt-0.5 text-sm font-bold',
                    stat.net > 0
                      ? 'text-green-600 dark:text-green-400'
                      : stat.net < 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500',
                  ]"
                >
                  {{ stat.net > 0 ? "+" : ""
                  }}{{ stat.net.toLocaleString() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settlement Suggestions -->
      <div>
        <h3
          class="mb-3 flex items-center gap-1.5 px-2 text-sm font-bold text-gray-500 dark:text-gray-400"
        >
          <CategoryIcon name="payments" class="h-4 w-4" /> {{ $t("settlementSheet.suggestedTransfers") }}
        </h3>
        <div
          v-if="settlements.length === 0"
          class="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-800"
        >
          <div class="mb-2 flex items-center justify-center">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-3xl bg-green-50 text-3xl text-green-500 dark:bg-green-900/30 dark:text-green-400"
            >
              <CategoryIcon name="celebration" />
            </div>
          </div>
          <p class="text-lg font-bold text-gray-800 dark:text-gray-200">
            {{ $t("settlementSheet.allSettled") }}
          </p>
          <p
            class="mt-1 text-sm font-medium text-gray-400 dark:text-gray-500"
          >
            {{ $t("settlementSheet.noTransfersNeeded") }}
          </p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(s, i) in settlements"
            :key="i"
            class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600 shadow-inner dark:bg-red-900/30 dark:text-red-400 dark:shadow-none"
            >
              {{ s.from.name.charAt(0) }}
            </div>
            <div class="min-w-0 flex-1">
              <p
                class="text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                <span
                  class="text-base font-bold text-gray-800 dark:text-gray-200"
                  >{{ s.from.name }}</span
                >
                {{ $t("settlementSheet.giveTo") }}
                <span
                  class="text-base font-bold text-gray-800 dark:text-gray-200"
                  >{{ s.to.name }}</span
                >
              </p>
            </div>
            <div
              class="shrink-0 rounded-xl bg-orange-50 px-3 py-1.5 text-right dark:bg-orange-900/30"
            >
              <span
                class="text-base font-bold text-orange-600 dark:text-orange-400"
                >NT$ {{ s.amount.toLocaleString() }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import type { Settlement } from "../../stores/tracker";
import CategoryIcon from "../CategoryIcon.vue";
import BaseBottomSheet from "../BaseBottomSheet.vue";

defineProps<{
  modelValue: boolean;
  bookName: string;
  memberStats: {
    member: { id: string; name: string };
    paid: number;
    owed: number;
    net: number;
  }[];
  settlements: Settlement[];
}>();

defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>
