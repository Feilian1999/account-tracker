<template>
  <div class="grid grid-cols-3 gap-3">
    <div class="min-w-0 rounded-2xl bg-white/15 p-3 text-center">
      <p :class="['text-xs', labelClass]">{{ $t('common.totalExpense') }}</p>
      <p class="mt-0.5 truncate font-bold text-white" :class="valueClass" :title="totalExpense.toLocaleString()">
        {{ totalExpense.toLocaleString() }}
      </p>
    </div>
    <div class="min-w-0 rounded-2xl bg-white/15 p-3 text-center">
      <p :class="['text-xs', labelClass]">{{ $t('common.totalIncome') }}</p>
      <p class="mt-0.5 truncate font-bold text-white" :class="valueClass" :title="totalIncome.toLocaleString()">
        {{ totalIncome.toLocaleString() }}
      </p>
    </div>
    <div class="min-w-0 rounded-2xl bg-white/15 p-3 text-center">
      <p :class="['text-xs', labelClass]">{{ $t('common.net') }}</p>
      <p
        class="mt-0.5 truncate font-bold"
        :class="[valueClass, balance < 0 ? 'text-red-300' : 'text-green-300']"
        :title="balance.toLocaleString()"
      >
        {{ balance.toLocaleString() }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  totalExpense: number;
  totalIncome: number;
  balance: number;
  /** Tailwind class for the label (e.g. 'text-violet-200', 'text-blue-200') */
  labelClass?: string;
  /** Tailwind class for the value font size (e.g. 'text-lg', 'text-base') */
  valueClass?: string;
}>();
</script>
