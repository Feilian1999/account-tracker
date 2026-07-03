<template>
  <main class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12 dark:bg-gray-950">
    <section class="w-full max-w-sm" aria-labelledby="login-title">
      <header class="mb-10 text-center">
        <div class="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-[2rem] shadow-xl shadow-violet-500/20">
          <img src="/magic-sheep-combined.png" alt="Account Tracker" class="h-full w-full object-cover" />
        </div>
        <h1 id="login-title" class="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
          {{ $t("login.title") }}
        </h1>
        <p class="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ $t("login.subtitle") }}
        </p>
      </header>

      <form class="space-y-6" @submit.prevent="handleStart">
        <div class="space-y-2">
          <label for="login-name" class="px-1 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {{ $t("setup.namePrompt") }}
          </label>
          <input
            id="login-name"
            ref="nameInput"
            v-model="name"
            required
            type="text"
            autocomplete="name"
            :placeholder="$t('login.namePlaceholder')"
            :class="[
              'w-full px-5 py-4 rounded-2xl border-2 outline-none',
              'bg-white border-gray-100 placeholder:text-gray-300',
              'dark:bg-gray-900 dark:border-gray-800 dark:placeholder:text-gray-700',
              'text-sm font-bold text-gray-900 dark:text-white',
              'focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:focus:border-violet-500',
            ]"
          />
        </div>

        <div class="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
          <p class="text-[11px] font-bold leading-relaxed text-amber-700 dark:text-amber-500">
            {{ $t("login.anonymousWarning") }}
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <button
            type="submit"
            :disabled="!name.trim() || submitting"
            :class="[
              'w-full px-4 py-4 rounded-2xl shadow-lg shadow-violet-500/25',
              'bg-violet-600 text-white text-sm font-bold',
              'transition-all hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50',
            ]"
          >
            {{ $t("login.startBtn") }}
          </button>
        </div>

        <footer class="mt-8 text-center">
          <nav class="flex justify-center gap-4" aria-label="Legal links">
            <router-link to="/privacy" class="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400">
              {{ $t("privacy.title") }}
            </router-link>
            <span class="text-[10px] text-gray-300 dark:text-gray-800" aria-hidden="true">&bull;</span>
            <router-link to="/terms" class="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400">
              {{ $t("terms.title") }}
            </router-link>
          </nav>
        </footer>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useTemplateRef, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTrackerStore } from "../stores/tracker";

const store = useTrackerStore();
const router = useRouter();

const name = ref(store.userProfile.name || "");
const submitting = ref(false);
const nameInput = useTemplateRef("nameInput");

const handleStart = async () => {
  if (!name.value.trim() || submitting.value) return;
  submitting.value = true;
  try {
    await store.loginAnonymous(name.value);
    router.replace("/dashboard");
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  nameInput.value?.focus();
});
</script>
