<template>
  <div class="relative w-full max-w-sm mx-auto">
    <!-- Main Selector Bar -->
    <div
      class="flex items-center justify-between rounded-2xl bg-white px-2 py-0.5 shadow-sm dark:bg-gray-800"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Previous Month Button -->
      <button
        @click="prevMonth"
        class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 z-10"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Center Display with Slide Transition -->
      <div 
        class="relative flex h-10 flex-1 cursor-pointer items-center justify-center overflow-hidden z-10"
        @click="mode === 'month' ? showPicker = true : null"
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
      </div>

      <!-- Next Month Button -->
      <button
        @click="nextMonth"
        class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 active:scale-95 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 z-10"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Custom Month Picker Modal -->
    <Teleport to="body">
      <div v-if="showPicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showPicker = false">
        <div class="w-full max-w-xs animate-slide-up rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
          <!-- Year Selector -->
          <div class="mb-6 flex items-center justify-between">
            <button @click="pickerYear--" class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg class="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ pickerYear }}</span>
            <button @click="pickerYear++" class="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg class="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <!-- Month Grid -->
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="m in 12"
              :key="m"
              @click="selectMonth(m)"
              :class="[
                'rounded-xl py-3 text-sm font-bold transition-colors',
                isSelected(m)
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              ]"
            >
              {{ locale === 'zh-TW' || locale === 'ja' ? `${m}月` : new Date(2000, m - 1).toLocaleString('en-US', { month: 'short' }) }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  modelValue: string; // format: YYYY-MM
  mode?: "all" | "year" | "month";
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const { locale } = useI18n();
const transitionName = ref("slide-left");
const showPicker = ref(false);
const pickerYear = ref(parseInt(props.modelValue.split("-")[0]) || new Date().getFullYear());

const touchStartX = ref(0);
const dragOffset = ref(0);
const isDragging = ref(false);

const currentYear = computed(() => parseInt(props.modelValue.split("-")[0]));
const currentMonth = computed(() => parseInt(props.modelValue.split("-")[1]));

const isSelected = (m: number) => {
  return pickerYear.value === currentYear.value && m === currentMonth.value;
};

const selectMonth = (m: number) => {
  const mStr = String(m).padStart(2, "0");
  const newValue = `${pickerYear.value}-${mStr}`;
  updateValue(newValue);
  showPicker.value = false;
};

// Reset picker year when opened
watch(showPicker, (val) => {
  if (val) {
    pickerYear.value = currentYear.value;
  }
});

const getYearMonth = (offset: number) => {
  if (!props.modelValue) return "";
  const [year, month] = props.modelValue.split("-").map(Number);
  
  if (props.mode === "year") {
    // Only adjust the year, keeping month identical
    return `${year + offset}-${String(month).padStart(2, "0")}`;
  }
  
  // Default month offset
  const date = new Date(year, month - 1 + offset, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const updateValue = (newValue: string) => {
  if (newValue > props.modelValue) {
    transitionName.value = "slide-left";
  } else if (newValue < props.modelValue) {
    transitionName.value = "slide-right";
  }
  emit("update:modelValue", newValue);
};

const prevMonth = () => {
  updateValue(getYearMonth(-1));
};

const nextMonth = () => {
  updateValue(getYearMonth(1));
};

// Touch Handlers for Swipe
const onTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.changedTouches[0].screenX;
  isDragging.value = true;
  dragOffset.value = 0;
};

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return;
  
  // Calculate raw offset
  const currentX = e.changedTouches[0].screenX;
  let offset = currentX - touchStartX.value;
  
  // Add some friction/resistance so it doesn't drag too wildly
  dragOffset.value = offset * 0.4;
};

const onTouchEnd = () => {
  isDragging.value = false;
  // If dragged far enough to the left (swipe left) -> next month
  if (dragOffset.value < -30) {
    nextMonth();
  } 
  // If dragged far enough to the right (swipe right) -> prev month
  else if (dragOffset.value > 30) {
    prevMonth();
  }
  // Reset offset for next animation
  dragOffset.value = 0;
};

const formattedDisplay = computed(() => {
  if (!props.modelValue) return "";
  const [year, month] = props.modelValue.split("-").map(Number);
  
  if (props.mode === "year") {
    if (locale.value === "zh-TW" || locale.value === "ja") {
      return `${year}年`;
    }
    return `${year}`;
  }

  const date = new Date(year, month - 1, 1);
  if (locale.value === "zh-TW" || locale.value === "ja") {
    return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
  }
  const monthName = date.toLocaleString('en-US', { month: 'short' });
  return `${monthName} ${date.getFullYear()}`;
});
</script>

<style scoped>
/* Slide Left Animation (Next Month) */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Slide Left */
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Slide Right (Prev Month) */
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
