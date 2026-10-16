import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "../src/views/Profile.vue";

const toast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

const store = {
  userProfile: {
    id: "user-uuid-123",
    name: "Tester",
    theme: "sheep",
    animations: true,
    isLoggedIn: false,
  },
  isSyncing: false,
  backupByUUID: vi.fn().mockResolvedValue(true),
  restoreByUUID: vi.fn(),
  syncToCloud: vi.fn(),
  overwriteFromCloud: vi.fn(),
  setAnimations: vi.fn(),
  setTheme: vi.fn(),
  updateUserProfile: vi.fn(),
  importPersonalRecords: vi.fn(),
  customCategories: [],
};

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => store,
}));

vi.mock("../src/composables/useToast", () => ({
  useToast: () => toast,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale: { value: "en" },
    t: (key: string) => key,
  }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Profile backup feedback", () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    toast.info.mockClear();
    store.backupByUUID.mockClear();
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("copies the UUID and announces the backup result after a successful manual backup", async () => {
    const wrapper = mount(Profile, {
      global: {
        mocks: {
          $t: (key: string) => key,
          $i18n: { locale: "en" },
        },
        stubs: {
          BaseBottomSheet: {
            template: "<div><slot /><slot name='footer' /></div>",
          },
          CategoryIcon: { template: "<span />" },
          CategorySettingsModal: { template: "<div />" },
          ProfileSettingItem: {
            props: ["title"],
            template:
              "<button type='button' @click=\"$emit('click')\">{{ title }}</button>",
          },
          TemplateSettingsModal: { template: "<div />" },
          NoteSettingsModal: { template: "<div />" },
        },
      },
    });

    const backupButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "profile.backupByUUID");

    expect(backupButton).toBeDefined();
    await backupButton!.trigger("click");

    expect(store.backupByUUID).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("user-uuid-123");
    expect(toast.success).toHaveBeenCalledWith("sync.backupCopied");
  });
});
