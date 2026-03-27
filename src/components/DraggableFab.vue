<template>
  <div
    :style="{
      left: fabPos.x + 'px',
      top: fabPos.y + 'px',
      transition: isDragging
        ? 'none'
        : 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    }"
    class="fixed z-40 select-none"
    @mousedown="startDrag"
    @touchstart.passive="startDragTouch"
  >
    <button
      type="button"
      :aria-label="ariaLabel"
      :class="[
        'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-transform active:scale-95',
        colorClasses[color].bg,
      ]"
      :style="{
        boxShadow: isDragging
          ? `0 20px 40px ${colorClasses[color].shadow}`
          : '',
      }"
      @click="onFabClick"
    >
      <slot>
        <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

const emit = defineEmits(["click"]);

defineProps({
  color: {
    type: String as () => "violet" | "blue" | "indigo" | "emerald",
    default: "violet",
  },
  ariaLabel: {
    type: String,
    default: "Add",
  },
});

const colorClasses = {
  violet: {
    bg: "bg-violet-600 hover:bg-violet-700",
    shadow: "var(--color-fab-violet, rgba(139,92,246,0.5))",
  },
  blue: {
    bg: "bg-blue-600 hover:bg-blue-700",
    shadow: "var(--color-fab-blue, rgba(37,99,235,0.5))",
  },
  indigo: {
    bg: "bg-indigo-600 hover:bg-indigo-700",
    shadow: "var(--color-fab-indigo, rgba(79,70,229,0.5))",
  },
  emerald: {
    bg: "bg-emerald-600 hover:bg-emerald-700",
    shadow: "var(--color-fab-emerald, rgba(5,150,105,0.5))",
  },
};

const isDragging = ref(false);
const fabPos = ref({ x: window.innerWidth - 80, y: window.innerHeight - 160 });

let dragStartX = 0;
let dragStartY = 0;
let fabStartX = 0;
let fabStartY = 0;
let didMove = false;

const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  didMove = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  fabStartX = fabPos.value.x;
  fabStartY = fabPos.value.y;
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
};

const startDragTouch = (e: TouchEvent) => {
  isDragging.value = true;
  didMove = false;
  dragStartX = e.touches[0].clientX;
  dragStartY = e.touches[0].clientY;
  fabStartX = fabPos.value.x;
  fabStartY = fabPos.value.y;
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
};

const onDragMove = (e: MouseEvent) => {
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove = true;
  clampFab(fabStartX + dx, fabStartY + dy);
};

const onTouchMove = (e: TouchEvent) => {
  e.preventDefault();
  const dx = e.touches[0].clientX - dragStartX;
  const dy = e.touches[0].clientY - dragStartY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove = true;
  clampFab(fabStartX + dx, fabStartY + dy);
};

const clampFab = (x: number, y: number) => {
  const size = 56;
  fabPos.value = {
    x: Math.max(8, Math.min(window.innerWidth - size - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - size - 80, y)),
  };
};

const snapToEdge = () => {
  const size = 56;
  const midX = fabPos.value.x + size / 2;
  const snapLeft = 16;
  const snapRight = window.innerWidth - size - 16;
  fabPos.value.x = midX < window.innerWidth / 2 ? snapLeft : snapRight;
};

const onDragEnd = () => {
  isDragging.value = false;
  snapToEdge();
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
};

const onTouchEnd = () => {
  isDragging.value = false;
  snapToEdge();
  window.removeEventListener("touchmove", onTouchMove);
  window.removeEventListener("touchend", onTouchEnd);
};

const onFabClick = () => {
  if (!didMove) {
    emit("click");
  }
};

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
  window.removeEventListener("touchmove", onTouchMove);
  window.removeEventListener("touchend", onTouchEnd);
});
</script>
