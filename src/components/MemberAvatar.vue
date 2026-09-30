<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none"
    :class="[sizeClass, memberColor(seed)]"
    aria-hidden="true"
  >
    {{ memberInitial(name) }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { memberColor, memberInitial } from "../utils/member";

const props = withDefaults(
  defineProps<{
    name: string;
    /** Colour seed — the member id, so the colour survives a rename. */
    seed: string;
    size?: "xs" | "sm" | "md" | "lg";
  }>(),
  { size: "md" },
);

const sizeClass = computed(
  () =>
    ({
      xs: "h-5 w-5 text-[10px]",
      sm: "h-7 w-7 text-xs",
      md: "h-9 w-9 text-sm",
      lg: "h-11 w-11 text-base",
    })[props.size],
);
</script>
