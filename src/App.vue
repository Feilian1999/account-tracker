<template>
  <div
    v-if="store.isInitialized"
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
  <div v-else class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, onBeforeUnmount, watch } from "vue";
import { useTrackerStore } from "./stores/tracker";
import BottomNav from "./components/BottomNav.vue";
import ToastContainer from "./components/ToastContainer.vue";

const store = useTrackerStore();

onBeforeMount(async () => {
  await store.init();
});

const applyTheme = (theme: string) => {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const isSheep = theme === "sheep";

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("theme-sheep", isSheep);

  // Update theme-color meta tag for mobile status bar
  const themeColor = isSheep ? "#d4a373" : isDark ? "#111827" : "#f9fafb";
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", themeColor);
  }
};

watch(
  () => store.userProfile.theme,
  (theme) => applyTheme(theme),
  { immediate: true },
);

// Re-apply when the OS colour scheme changes while on the 'system' theme.
const media = window.matchMedia("(prefers-color-scheme: dark)");
const onSchemeChange = () => {
  if (store.userProfile.theme === "system") applyTheme("system");
};
media.addEventListener("change", onSchemeChange);
onBeforeUnmount(() => media.removeEventListener("change", onSchemeChange));

watch(
  () => store.userProfile.animations,
  (enabled) => {
    document.documentElement.classList.toggle("no-animations", !enabled);
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
