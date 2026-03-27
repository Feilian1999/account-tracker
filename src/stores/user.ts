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
  save: () => void
) {
  const isProfileSet = computed(() => userProfile.value.name.trim() !== "");

  function updateUserProfile(name: string) {
    userProfile.value.name = name.trim();
    save();
  }

  function loginAnonymous(name: string) {
    userProfile.value.isLoggedIn = false;
    userProfile.value.authToken = undefined;
    updateUserProfile(name);
  }

  function loginGoogle(data: { name: string; email: string; avatar: string; token: string }) {
    userProfile.value.name = data.name.trim();
    userProfile.value.email = data.email;
    userProfile.value.avatar = data.avatar;
    userProfile.value.authToken = data.token;
    userProfile.value.isLoggedIn = true;
    save();
  }

  function setTheme(theme: "light" | "dark" | "system") {
    userProfile.value.theme = theme;
    saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile.value);
  }

  function setAnimations(enabled: boolean) {
    userProfile.value.animations = enabled;
    saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile.value);
  }

  return {
    isProfileSet,
    updateUserProfile,
    loginAnonymous,
    loginGoogle,
    setTheme,
    setAnimations,
  };
}
