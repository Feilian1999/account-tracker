<template>
  <div class="relative mx-auto w-full max-w-sm">
    <div
      class="flex items-center justify-between rounded-2xl bg-white px-2 py-0.5 shadow-sm dark:bg-gray-800"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <button
        type="button"
        class="z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        :aria-label="mode === 'year' ? 'Previous year' : 'Previous month'"
        @click="prevMonth"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        class="relative z-10 flex h-10 flex-1 cursor-pointer items-center justify-center overflow-hidden"
        :disabled="mode !== 'month'"
        :aria-controls="mode === 'month' ? pickerDialogId : undefined"
        :aria-expanded="mode === 'month' ? showPicker : undefined"
        :aria-haspopup="mode === 'month' ? 'dialog' : undefined"
        @click="mode === 'month' ? (showPicker = true) : null"
      >
        <transition :name="transitionName">
          <div
            :key="modelValue + mode"
            class="absolute flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100"
            :style="{ transform: isDragging ? `translateX(${dragOffset}px)` : '' }"
          >
            {{ formattedDisplay }}
          </div>
        </transition>
      </button>

      <button
        type="button"
        class="z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        :aria-label="mode === 'year' ? 'Next year' : 'Next month'"
        @click="nextMonth"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="showPicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showPicker = false">
        <section
          :id="pickerDialogId"
          class="w-full max-w-xs animate-slide-up rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="pickerTitleId"
        >
          <div class="mb-6 flex items-center justify-between">
            <button type="button" class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous year" @click="pickerYear--">
              <svg class="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 :id="pickerTitleId" class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ pickerYear }}</h2>
            <button type="button" class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next year" @click="pickerYear++">
              <svg class="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="m in 12"
              :key="m"
              type="button"
              :class="[
                'rounded-xl py-3 text-sm font-bold transition-colors',
                isSelected(m)
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              ]"
              @click="selectMonth(m)"
            >
              {{ formatPickerMonth(m) }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  modelValue: string;
  mode?: "all" | "year" | "month";
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const { locale } = useI18n();
const transitionName = ref("slide-left");
const showPicker = ref(false);
const pickerYear = ref(parseInt(props.modelValue.split("-")[0], 10) || new Date().getFullYear());
const pickerDialogId = "month-selector-dialog";
const pickerTitleId = "month-selector-title";

const touchStartX = ref(0);
const dragOffset = ref(0);
const isDragging = ref(false);

const currentYear = computed(() => parseInt(props.modelValue.split("-")[0], 10));
const currentMonth = computed(() => parseInt(props.modelValue.split("-")[1], 10));

const isSelected = (m: number) => pickerYear.value === currentYear.value && m === currentMonth.value;

const formatPickerMonth = (month: number) => {
  if (locale.value === "zh-TW" || locale.value === "ja") {
    return `${month}月`;
  }
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "short" });
};

const selectMonth = (m: number) => {
  const mStr = String(m).padStart(2, "0");
  updateValue(`${pickerYear.value}-${mStr}`);
  showPicker.value = false;
};

watch(showPicker, (val) => {
  if (val) {
    pickerYear.value = currentYear.value;
  }
});

const getYearMonth = (offset: number) => {
  if (!props.modelValue) return "";
  const [year, month] = props.modelValue.split("-").map(Number);

  if (props.mode === "year") {
    return `${year + offset}-${String(month).padStart(2, "0")}`;
  }

  const date = new Date(year, month - 1 + offset, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
};

const updateValue = (newValue: string) => {
  if (newValue > props.modelValue) transitionName.value = "slide-left";
  else if (newValue < props.modelValue) transitionName.value = "slide-right";
  emit("update:modelValue", newValue);
};

const prevMonth = () => updateValue(getYearMonth(-1));
const nextMonth = () => updateValue(getYearMonth(1));

const onTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.changedTouches[0].screenX;
  isDragging.value = true;
  dragOffset.value = 0;
};

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return;
  const currentX = e.changedTouches[0].screenX;
  dragOffset.value = (currentX - touchStartX.value) * 0.4;
};

const onTouchEnd = () => {
  isDragging.value = false;
  if (dragOffset.value < -30) nextMonth();
  else if (dragOffset.value > 30) prevMonth();
  dragOffset.value = 0;
};

const formattedDisplay = computed(() => {
  if (!props.modelValue) return "";
  const [year, month] = props.modelValue.split("-").map(Number);

  if (props.mode === "year") {
    return locale.value === "zh-TW" || locale.value === "ja" ? `${year}年` : `${year}`;
  }

  const date = new Date(year, month - 1, 1);
  if (locale.value === "zh-TW" || locale.value === "ja") {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  const monthName = date.toLocaleString("en-US", { month: "short" });
  return `${monthName} ${date.getFullYear()}`;
});
</script>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
