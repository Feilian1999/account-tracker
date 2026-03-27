<template>
  <main class="page-container">
    <header
      class="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 pb-8 pt-10 text-white shadow-lg"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-3xl font-bold backdrop-blur-sm"
        >
          <img
            v-if="store.userProfile.avatar"
            :src="store.userProfile.avatar"
            class="h-full w-full object-cover"
            :alt="`${store.userProfile.name} avatar`"
          />
          <span v-else aria-hidden="true">{{ store.userProfile.name.charAt(0) }}</span>
        </div>
        <div>
          <h1 class="text-2xl font-bold">{{ store.userProfile.name }}</h1>
          <p class="text-indigo-200">
            {{ store.userProfile.isLoggedIn ? $t("profile.cloudSynced") : $t("profile.localOnly") }}
          </p>
        </div>
      </div>
    </header>

    <div class="mt-6 space-y-4 px-4 pb-24">
      <button
        v-if="!store.userProfile.isLoggedIn"
        type="button"
        class="flex w-full items-center justify-between rounded-2xl bg-amber-50 p-4 text-left shadow-sm transition-all hover:bg-amber-100 active:scale-[0.98] dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
        @click="router.push('/login')"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-500">
            <CategoryIcon name="cloud_upload" class="h-6 w-6" />
          </div>
          <div>
            <h2 class="text-sm font-black text-amber-800 dark:text-amber-400">
              {{ $t("login.linkAccountTitle") }}
            </h2>
            <p class="text-[10px] font-bold text-amber-600 dark:text-amber-600">
              {{ $t("profile.localOnlyBanner") }}
            </p>
          </div>
        </div>
        <CategoryIcon name="chevron_right" class="h-5 w-5 text-amber-400" />
      </button>

      <section
        aria-labelledby="profile-preferences-heading"
        class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all dark:border-gray-800 dark:bg-gray-800"
      >
        <h2 id="profile-preferences-heading" class="sr-only">{{ $t("profile.settingsTitle") }}</h2>

        <div
          class="flex items-center justify-between border-b border-gray-50 p-4 transition-colors dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-900/30"
            >
              <CategoryIcon name="routine" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.themeSet") }}</span>
          </div>

          <button
            type="button"
            role="switch"
            :aria-checked="isDark"
            :class="[
              isDark ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600',
              'relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none',
            ]"
            @click="toggleTheme"
          >
            <span class="sr-only">{{ $t("profile.themeSet") }}</span>
            <span
              :class="[
                isDark ? 'translate-x-[26px]' : 'translate-x-[2px]',
                'pointer-events-none flex h-[24px] w-[24px] transform items-center justify-center rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out',
              ]"
            >
              <CategoryIcon
                :name="isDark ? 'dark_mode' : 'light_mode'"
                :class="[
                  isDark ? 'text-indigo-500' : 'text-orange-500',
                  'flex items-center justify-center text-[15px] leading-none',
                ]"
              />
            </span>
          </button>
        </div>

        <div
          class="flex items-center justify-between border-b border-gray-50 p-4 transition-colors dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500 dark:bg-cyan-900/30"
            >
              <CategoryIcon name="animation" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.animationSet") }}</span>
          </div>

          <button
            type="button"
            role="switch"
            :aria-checked="store.userProfile.animations"
            :class="[
              store.userProfile.animations ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600',
              'relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none',
            ]"
            @click="toggleAnimations"
          >
            <span class="sr-only">{{ $t("profile.animationSet") }}</span>
            <span
              :class="[
                store.userProfile.animations ? 'translate-x-[26px]' : 'translate-x-[2px]',
                'pointer-events-none flex h-[24px] w-[24px] transform items-center justify-center rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out',
              ]"
            >
              <CategoryIcon
                :name="store.userProfile.animations ? 'motion_photos_on' : 'motion_photos_off'"
                :class="[
                  store.userProfile.animations ? 'text-indigo-500' : 'text-gray-400',
                  'flex items-center justify-center text-[15px] leading-none',
                ]"
              />
            </span>
          </button>
        </div>

        <ProfileSettingItem
          :title="$t('profile.categorySet')"
          iconName="category"
          colorClasses="bg-violet-50 text-violet-600 dark:bg-violet-900/30"
          :isFirst="true"
          @click="showCategorySettings = true"
        />

        <ProfileSettingItem
          :title="$t('profile.templateSet')"
          iconName="receipt_long"
          colorClasses="bg-pink-50 text-pink-600 dark:bg-pink-900/30"
          @click="showTemplateSettings = true"
        />

        <ProfileSettingItem
          :title="$t('profile.languageSet')"
          iconName="language"
          colorClasses="bg-blue-50 text-blue-500 dark:bg-blue-900/30"
          @click="showLangSheet = true"
        >
          <template #right>
            <span class="text-sm font-bold text-gray-500 dark:text-gray-400">
              {{ langNameMap[$i18n.locale as keyof typeof langNameMap] || "English" }}
            </span>
          </template>
        </ProfileSettingItem>

        <ProfileSettingItem
          :title="$t('privacy.title')"
          iconName="shield"
          colorClasses="bg-gray-50 text-gray-500 dark:bg-gray-900/30"
          @click="router.push('/privacy')"
        />

        <ProfileSettingItem
          :title="$t('terms.title')"
          iconName="description"
          colorClasses="bg-gray-50 text-gray-500 dark:bg-gray-900/30"
          @click="router.push('/terms')"
        />

        <ProfileSettingItem
          v-if="!store.userProfile.isLoggedIn"
          :title="$t('profile.login')"
          iconName="login"
          colorClasses="bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30"
          @click="handleLogin"
        >
          <template #right>
            <span class="text-xs font-black uppercase tracking-wider text-amber-500">
              {{ $t("profile.notLinked") }}
            </span>
          </template>
        </ProfileSettingItem>

        <ProfileSettingItem
          v-else
          :title="$t('profile.logout')"
          iconName="logout"
          colorClasses="bg-red-50 text-red-500 dark:bg-red-900/30"
          @click="handleLogout"
        >
          <template #right>
            <span class="text-xs font-black uppercase tracking-wider text-emerald-500">
              {{ $t("profile.connected") }}
            </span>
          </template>
        </ProfileSettingItem>
      </section>

      <section v-if="store.userProfile.isLoggedIn" aria-labelledby="profile-cloud-sync-heading" class="space-y-3">
        <h2 id="profile-cloud-sync-heading" class="px-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {{ $t("profile.cloudSync") }}
        </h2>
        <div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all dark:border-gray-800 dark:bg-gray-800">
          <ProfileSettingItem
            :title="$t('profile.backupToCloud')"
            iconName="cloud_upload"
            colorClasses="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30"
            :isFirst="true"
            @click="store.syncToCloud"
          />
          <ProfileSettingItem
            :title="$t('profile.restoreFromCloud')"
            iconName="cloud_download"
            colorClasses="bg-blue-50 text-blue-600 dark:bg-blue-900/30"
            @click="store.overwriteFromCloud"
          />
        </div>
        <p class="px-2 text-[10px] font-bold text-gray-400 dark:text-gray-600">
          {{ $t("profile.backupNote") }}
        </p>
      </section>
    </div>

    <CategorySettingsModal
      v-if="showCategorySettings"
      @close="showCategorySettings = false"
    />

    <TemplateSettingsModal v-model="showTemplateSettings" />

    <BaseBottomSheet
      v-model="showLangSheet"
      :title="$t('profile.languageSet')"
    >
      <div class="space-y-2">
        <button
          v-for="(name, code) in langNameMap"
          :key="code"
          type="button"
          :aria-pressed="$i18n.locale === code"
          :class="[
            'flex w-full items-center justify-between rounded-2xl p-4 font-bold transition-all',
            $i18n.locale === code
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80',
          ]"
          @click="setLanguage(code)"
        >
          <span>{{ name }}</span>
          <svg v-if="$i18n.locale === code" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </BaseBottomSheet>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BaseBottomSheet from "../components/BaseBottomSheet.vue";
import CategoryIcon from "../components/CategoryIcon.vue";
import CategorySettingsModal from "../components/CategorySettingsModal.vue";
import ProfileSettingItem from "../components/ProfileSettingItem.vue";
import TemplateSettingsModal from "../components/TemplateSettingsModal.vue";
import { useTrackerStore } from "../stores/tracker";

const { locale, t } = useI18n();
const router = useRouter();
const store = useTrackerStore();
const showCategorySettings = ref(false);
const showTemplateSettings = ref(false);
const showLangSheet = ref(false);

const langNameMap = {
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
};

const toggleAnimations = () => {
  store.setAnimations(!store.userProfile.animations);
};

const isDark = computed(() => {
  const theme = store.userProfile.theme || "system";
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const toggleTheme = () => {
  store.setTheme(isDark.value ? "light" : "dark");
};

const handleLogin = () => {
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  window.location.href = `${backendUrl}/auth/google/login`;
};

const handleLogout = () => {
  if (confirm(t("profile.logoutConfirm"))) {
    store.userProfile.isLoggedIn = false;
    store.userProfile.authToken = undefined;
    store.userProfile.avatar = undefined;
    store.userProfile.email = undefined;
    store.updateUserProfile(store.userProfile.name);
  }
};

const setLanguage = (code: string | number | symbol) => {
  locale.value = code as string;
  localStorage.setItem("account-tracker-lang", code as string);
  showLangSheet.value = false;
};
</script>
