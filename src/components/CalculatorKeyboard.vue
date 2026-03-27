<template>
  <div class="calculator-keyboard select-none bg-gray-100 p-2 dark:bg-gray-800">
    <div class="grid grid-cols-4 gap-2">
      <!-- Row 1 -->
      <button type="button" class="btn-calc btn-bg-gray text-red-500" @click="handleClear">C</button>
      <button type="button" class="btn-calc btn-bg-gray text-violet-600 dark:text-violet-400" @click="handleInput('/')">÷</button>
      <button type="button" class="btn-calc btn-bg-gray text-violet-600 dark:text-violet-400" @click="handleInput('*')">×</button>
      <button type="button" class="btn-calc btn-bg-gray text-violet-600 dark:text-violet-400" @click="handleBackspace">⌫</button>

      <!-- Row 2 -->
      <button type="button" class="btn-calc btn-bg-white" @click="handleInput('7')">7</button>
      <button type="button" class="btn-calc btn-bg-white" @click="handleInput('8')">8</button>
      <button type="button" class="btn-calc btn-bg-white" @click="handleInput('9')">9</button>
      <button type="button" class="btn-calc btn-bg-gray text-violet-600 dark:text-violet-400" @click="handleInput('-')">−</button>

      <!-- Row 3 -->
      <button type="button" class="btn-calc btn-bg-white" @click="handleInput('4')">4</button>
      <button type="button" class="btn-calc btn-bg-white" @click="handleInput('5')">5</button>
      <button type="button" class="btn-calc btn-bg-white" @click="handleInput('6')">6</button>
      <button type="button" class="btn-calc btn-bg-gray text-violet-600 dark:text-violet-400" @click="handleInput('+')">+</button>

      <!-- Row 4-5 Layout -->
      <div class="col-span-3 grid grid-cols-3 gap-2">
        <button type="button" class="btn-calc btn-bg-white" @click="handleInput('1')">1</button>
        <button type="button" class="btn-calc btn-bg-white" @click="handleInput('2')">2</button>
        <button type="button" class="btn-calc btn-bg-white" @click="handleInput('3')">3</button>
        
        <button type="button" class="btn-calc btn-bg-white col-span-2" @click="handleInput('0')">0</button>
        <button type="button" class="btn-calc btn-bg-white" @click="handleInput('.')">.</button>
      </div>

      <div class="col-span-1 grid grid-rows-2 gap-2">
        <button type="button" class="btn-calc btn-bg-gray text-violet-600 dark:text-violet-400 h-full" @click="handleEvaluate">=</button>
        <button type="button" class="btn-calc bg-violet-600 text-white hover:bg-violet-700 h-full text-sm font-bold shadow-md shadow-violet-500/20 active:scale-95" @click="handleSubmit">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
  (e: "submit"): void;
}>();

const evaluateExpression = (str: string): string => {
  if (!str) return "";
  try {
    if (/^[\d+\-*/. ]+$/.test(str)) {
      const result = new Function(`return ${str}`)();
      if (!isNaN(result) && result > 0 && isFinite(result)) {
        // Drop decimals if not needed
        return String(Math.floor(result * 100) / 100);
      }
    }
  } catch {
    // ignore parse errors (e.g., trailing operator)
  }
  return str;
};

const handleInput = (val: string) => {
  emit("update:modelValue", props.modelValue + val);
};

const handleBackspace = () => {
  emit("update:modelValue", props.modelValue.slice(0, -1));
};

const handleClear = () => {
  emit("update:modelValue", "");
};

const handleEvaluate = () => {
  const evaluated = evaluateExpression(props.modelValue);
  emit("update:modelValue", evaluated);
};

const handleSubmit = () => {
  // auto-evaluate before submit
  const evaluated = evaluateExpression(props.modelValue);
  emit("update:modelValue", evaluated);
  
  // slightly defer so parent gets updated v-model before submit fires
  setTimeout(() => emit("submit"), 0);
};
</script>

<style scoped>
@reference "tailwindcss";

.btn-calc {
  @apply flex items-center justify-center rounded-xl p-4 text-xl font-medium transition-all active:scale-95 touch-manipulation;
}
.btn-bg-white {
  @apply bg-white text-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)] active:bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:active:bg-gray-600;
}
.btn-bg-gray {
  @apply bg-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:bg-gray-300/80 dark:bg-gray-600/50 dark:active:bg-gray-500/50;
}
</style>
