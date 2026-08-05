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
    <BaseBottomSheet v-model="showShortcutHelp" :title="$t('shortcuts.title')">
      <dl class="space-y-4">
        <div v-for="shortcut in shortcuts" :key="shortcut.keys" class="flex items-center justify-between gap-4">
          <dt class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ $t(shortcut.label) }}</dt>
          <dd><kbd class="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs font-bold text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">{{ shortcut.keys }}</kbd></dd>
        </div>
      </dl>
    </BaseBottomSheet>
  </div>
  <div v-else class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useTrackerStore } from "./stores/tracker";
import BottomNav from "./components/BottomNav.vue";
import ToastContainer from "./components/ToastContainer.vue";
import BaseBottomSheet from "./components/BaseBottomSheet.vue";
import { runPrimaryAction } from "./composables/usePrimaryAction";

const store = useTrackerStore();
const router = useRouter();
const showShortcutHelp = ref(false);
const modifierLabel = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
const shortcuts = [
  { keys: `${modifierLabel} + Enter`, label: "shortcuts.primary" },
  { keys: "Esc", label: "shortcuts.close" },
  { keys: "Alt + Shift + 1", label: "shortcuts.home" },
  { keys: "Alt + Shift + 2", label: "shortcuts.books" },
  { keys: "Alt + Shift + 3", label: "shortcuts.statistics" },
  { keys: "Alt + Shift + 4", label: "shortcuts.profile" },
  { keys: `${modifierLabel} + /`, label: "shortcuts.help" },
];

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

const shortcutRoutes: Record<string, string> = {
  Digit1: "/dashboard",
  Digit2: "/books",
  Digit3: "/statistics",
  Digit4: "/profile",
};

const onShortcut = (event: KeyboardEvent) => {
  // Older Safari reports the Enter key that commits IME text after
  // compositionend, but still exposes the legacy IME key code.
  if (
    event.isComposing ||
    event.keyCode === 229 ||
    event.repeat ||
    !store.isProfileSet
  )
    return;

  const primaryModifier = event.ctrlKey || event.metaKey;
  if (primaryModifier && event.key === "Enter") {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (runPrimaryAction(dialog ? 1 : 0) || dialog) event.preventDefault();
    return;
  }
  if (isEditable(event.target)) return;

  if (primaryModifier && event.key === "/") {
    event.preventDefault();
    showShortcutHelp.value = !showShortcutHelp.value;
    return;
  }

  const path = event.altKey && event.shiftKey ? shortcutRoutes[event.code] : undefined;
  if (path && !document.querySelector('[role="dialog"][aria-modal="true"]')) {
    event.preventDefault();
    router.push(path);
  }
};

onMounted(() => window.addEventListener("keydown", onShortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", onShortcut));

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
