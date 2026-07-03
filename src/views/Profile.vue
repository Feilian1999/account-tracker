<template>
  <main class="page-container">
    <header
      class="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 pb-8 pt-10 text-white shadow-lg"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-3xl font-bold backdrop-blur-sm"
        >
          <span aria-hidden="true">{{ store.userProfile.name.charAt(0) }}</span>
        </div>
        <div class="flex-grow">
          <h1 class="text-2xl font-bold">{{ store.userProfile.name }}</h1>
          <div class="mt-1 flex items-center gap-2">
            <p class="text-xs font-medium text-indigo-100 opacity-80">
              ID: {{ store.userProfile.id }}
            </p>
            <button 
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded bg-white/10 hover:bg-white/20 active:scale-90 transition-all font-bold"
              @click="copyUUID"
              title="Copy UUID"
            >
              <CategoryIcon :name="copied ? 'check' : 'content_copy'" class="!text-[10px]" />
            </button>
          </div>
          <p class="mt-1 text-sm text-indigo-200">
            {{ $t("profile.localOnly") }}
          </p>
        </div>
      </div>
    </header>

    <div class="mt-6 space-y-4 px-4 pb-24">
      <section
        aria-labelledby="profile-preferences-heading"
        class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all dark:border-gray-800 dark:bg-gray-800"
      >
        <h2 id="profile-preferences-heading" class="sr-only">{{ $t("profile.settingsTitle") }}</h2>

        <div
          class="flex cursor-pointer items-center justify-between border-b border-gray-50 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
          @click="showThemeSheet = true"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-900/30"
            >
              <CategoryIcon :name="themeIconMap[store.userProfile.theme || 'sheep']" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.themeSet") }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-gray-500 dark:text-gray-400">
              {{ themeNameMap[store.userProfile.theme || "sheep"] }}
            </span>
            <CategoryIcon name="chevron_right" class="h-5 w-5 text-gray-300" />
          </div>
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

      </section>

      <section aria-labelledby="profile-data-ops-heading" class="space-y-3">
        <h2 id="profile-data-ops-heading" class="px-2 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {{ $t("profile.dataOperations") }}
        </h2>
        <div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all dark:border-gray-800 dark:bg-gray-800">
          <ProfileSettingItem
            :disabled="store.isSyncing"
            :title="$t('profile.backupByUUID')"
            iconName="save"
            colorClasses="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30"
            :isFirst="true"
            @click="handleBackupByUUID"
          />
          <ProfileSettingItem
            :disabled="store.isSyncing"
            :title="$t('profile.restoreByUUID')"
            iconName="restore"
            colorClasses="bg-amber-50 text-amber-600 dark:bg-amber-900/30"
            @click="handleRestoreByUUID"
          />
          <ProfileSettingItem
            :disabled="store.isSyncing"
            :title="$t('profile.importPiggy')"
            iconName="upload_file"
            colorClasses="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30"
            @click="triggerPiggyImport"
          />
          <input
            ref="piggyFileInput"
            type="file"
            accept=".txt"
            class="hidden"
            @change="handlePiggyFile"
          />
          <ProfileSettingItem
            :disabled="store.isSyncing"
            :title="$t('profile.importEveryday')"
            iconName="csv"
            colorClasses="bg-blue-50 text-blue-600 dark:bg-blue-900/30"
            @click="triggerEverydayImport"
          />
          <input
            ref="everydayFileInput"
            type="file"
            accept=".csv"
            class="hidden"
            @change="handleEverydayFile"
          />
        </div>
      </section>
    </div>

    <CategorySettingsModal
      v-if="showCategorySettings"
      @close="showCategorySettings = false"
    />

    <TemplateSettingsModal v-model="showTemplateSettings" />

    <BaseBottomSheet
      v-model="showThemeSheet"
      :title="$t('profile.themeSet')"
    >
      <div class="space-y-2">
        <button
          v-for="(name, code) in themeNameMap"
          :key="code"
          type="button"
          :aria-pressed="store.userProfile.theme === code"
          :class="[
            'flex w-full items-center justify-between rounded-2xl p-4 font-bold transition-all',
            store.userProfile.theme === code
              ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80',
          ]"
          @click="setTheme(code)"
        >
          <div class="flex items-center gap-3">
            <CategoryIcon :name="themeIconMap[code]" class="h-5 w-5" />
            <span>{{ name }}</span>
          </div>
          <svg v-if="store.userProfile.theme === code" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </BaseBottomSheet>

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
import { useToast } from "../composables/useToast";
import { useTrackerStore } from "../stores/tracker";
import { parseEverydayCSV } from "../utils/everydayImport";
import { parsePiggyBackup } from "../utils/piggyImport";

const { locale, t } = useI18n();
const router = useRouter();
const store = useTrackerStore();
const showCategorySettings = ref(false);
const showTemplateSettings = ref(false);
const showLangSheet = ref(false);
const showThemeSheet = ref(false);
const piggyFileInput = ref<HTMLInputElement | null>(null);
const everydayFileInput = ref<HTMLInputElement | null>(null);
const toast = useToast();
const copied = ref(false);

const copyUUID = async () => {
  try {
    await navigator.clipboard.writeText(store.userProfile.id);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
};

const handleBackupByUUID = async () => {
  if (store.isSyncing) return;
  const backedUp = await store.backupByUUID();
  if (!backedUp) return;

  const copiedToClipboard = await copyUUID();
  if (copiedToClipboard) {
    toast.success(t("sync.backupCopied"));
    return;
  }

  toast.info(t("sync.backupReady", { uuid: store.userProfile.id }));
};

const handleRestoreByUUID = async () => {
  if (store.isSyncing) return;
  const uuid = prompt(t("profile.restoreByUUIDPrompt"));
  if (uuid && uuid.trim()) {
    await store.restoreByUUID(uuid.trim());
  }
};

const langNameMap = {
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
};

const toggleAnimations = async () => {
  await store.setAnimations(!store.userProfile.animations);
};

const themeNameMap = computed(() => ({
  sheep: t("profile.themeSheep"),
  light: t("profile.themeLight"),
  dark: t("profile.themeDark"),
  system: t("profile.themeSystem"),
}));

const themeIconMap = {
  sheep: "pets",
  light: "light_mode",
  dark: "dark_mode",
  system: "settings_brightness",
};

const setTheme = async (code: any) => {
  await store.setTheme(code);
  showThemeSheet.value = false;
};

const setLanguage = (code: string | number | symbol) => {
  locale.value = code as string;
  localStorage.setItem("account-tracker-lang", code as string);
  showLangSheet.value = false;
};

const triggerPiggyImport = () => {
  piggyFileInput.value?.click();
};

const handlePiggyFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    const content = e.target?.result as string;
    try {
      const records = parsePiggyBackup(content);
      if (records.length > 0) {
        await store.importPersonalRecords(records);
        toast.success(t("profile.importSuccess", { count: records.length }));
      }
    } catch (err) {
      console.error("Import failed:", err);
      toast.error(t("profile.importPiggyError"));
    }
    // Reset input
    input.value = "";
  };

  reader.readAsText(file);
};

const triggerEverydayImport = () => {
  everydayFileInput.value?.click();
};

const handleEverydayFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    const content = e.target?.result as string;
    try {
      const records = parseEverydayCSV(content);
      if (records.length > 0) {
        await store.importPersonalRecords(records);
        toast.success(t("profile.importSuccess", { count: records.length }));
      } else {
        toast.error(t("profile.importCSVError"));
      }
    } catch (err) {
      console.error("Import failed:", err);
      toast.error(t("profile.importCSVError"));
    }
    // Reset input
    input.value = "";
  };

  reader.readAsText(file, "UTF-8");
};
</script>
