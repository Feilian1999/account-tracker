<template>
  <div
    class="relative mx-auto min-h-screen max-w-md overflow-hidden bg-gray-50 transition-colors duration-300 dark:bg-gray-900 sm:rounded-none md:rounded-3xl md:shadow-2xl"
  >
    <router-view v-slot="{ Component }">
      <transition :name="store.userProfile.animations ? 'fade' : ''" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <BottomNav v-if="store.isProfileSet" />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useTrackerStore } from "./stores/tracker";
import BottomNav from "./components/BottomNav.vue";
import ToastContainer from "./components/ToastContainer.vue";

const store = useTrackerStore();

watch(
  () => store.userProfile.theme,
  (theme) => {
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", isDark);
  },
  { immediate: true },
);
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
