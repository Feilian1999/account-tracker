import type { Ref } from "vue";
import { computed } from "vue";
import type { UserProfile } from "./types";
import { saveToStorage, STORAGE_KEYS } from "./storage";

/**
 * User profile & settings actions.
 * Receives the shared reactive refs from the main store.
 */
export function setupUserActions(
  userProfile: Ref<UserProfile>,
  save: () => Promise<void>
) {
  const isProfileSet = computed(() => userProfile.value.name.trim() !== "");

  async function updateUserProfile(name: string) {
    userProfile.value.name = name.trim();
    await save();
  }

  async function loginAnonymous(name: string) {
    await updateUserProfile(name);
  }

  async function setTheme(theme: "light" | "dark" | "system" | "sheep") {
    userProfile.value.theme = theme;
    // Save to both for different access patterns
    await saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile.value);
    localStorage.setItem("account-tracker-theme", theme);
  }

  async function setAnimations(enabled: boolean) {
    userProfile.value.animations = enabled;
    await saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile.value);
  }

  return {
    isProfileSet,
    updateUserProfile,
    loginAnonymous,
    setTheme,
    setAnimations,
  };
}
