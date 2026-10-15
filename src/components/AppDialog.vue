<template>
  <Teleport to="body">
    <transition :name="store.userProfile.animations ? 'fade' : ''">
      <div
        v-if="dialog"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="cancel"
      >
        <section
          :key="dialog.id"
          :class="[
            'flex w-full max-w-sm flex-col rounded-2xl bg-white p-6 shadow-xl transition-colors dark:bg-gray-900',
            store.userProfile.animations ? 'animate-slide-up' : '',
          ]"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="request.title ? titleId : undefined"
          :aria-describedby="messageId"
        >
          <h2
            v-if="request.title"
            :id="titleId"
            class="mb-2 text-lg font-bold text-gray-800 dark:text-gray-100"
          >
            {{ request.title }}
          </h2>
          <p
            :id="messageId"
            class="text-sm leading-relaxed whitespace-pre-line text-gray-600 dark:text-gray-300"
          >
            {{ request.message }}
          </p>

          <form class="mt-5" @submit.prevent="confirm">
            <input
              v-if="request.kind === 'prompt'"
              ref="inputEl"
              v-model="value"
              type="text"
              class="input-field mb-5"
              :placeholder="request.placeholder"
              :readonly="request.readOnly"
              :aria-labelledby="messageId"
              autocomplete="off"
              @focus="
                request.readOnly && ($event.target as HTMLInputElement).select()
              "
            />
            <div class="flex justify-end gap-2">
              <button
                v-if="!(request.kind === 'prompt' && request.readOnly)"
                ref="cancelEl"
                type="button"
                class="btn-secondary"
                @click="cancel"
              >
                {{ request.cancelText ?? $t("common.cancel") }}
              </button>
              <button
                ref="confirmEl"
                type="submit"
                :class="
                  request.danger
                    ? 'inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-red-600 active:bg-red-700'
                    : 'btn-primary'
                "
              >
                {{ confirmLabel }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../stores/tracker";
import {
  currentDialog,
  settleDialog,
  type DialogRequest,
} from "../composables/useDialog";
import { useEscapeKey } from "../composables/useEscapeKey";
import { usePrimaryAction } from "../composables/usePrimaryAction";

const store = useTrackerStore();
const { t } = useI18n();
const titleId = useId();
const messageId = useId();

const dialog = currentDialog;
const request = computed(() => dialog.value?.request ?? ({} as DialogRequest));
const isOpen = computed(() => !!dialog.value);

const value = ref("");
const inputEl = ref<HTMLInputElement>();
const cancelEl = ref<HTMLButtonElement>();
const confirmEl = ref<HTMLButtonElement>();
let returnFocus: HTMLElement | null = null;

const confirmLabel = computed(
  () =>
    request.value.confirmText ??
    (request.value.danger ? t("common.delete") : t("common.ok")),
);

// Each new dialog: reset the field and focus the right control — Cancel for a
// destructive one, so a stray Enter can't delete anything.
watch(
  () => dialog.value?.id,
  async (id, previous) => {
    if (id === undefined) {
      returnFocus?.focus?.();
      returnFocus = null;
      return;
    }
    if (previous === undefined) {
      returnFocus = document.activeElement as HTMLElement | null;
    }
    const req = request.value;
    value.value = req.kind === "prompt" ? (req.defaultValue ?? "") : "";
    await nextTick();
    if (req.kind === "prompt") inputEl.value?.focus();
    else if (req.danger) cancelEl.value?.focus();
    else confirmEl.value?.focus();
  },
);

const confirm = () => {
  if (!dialog.value) return;
  settleDialog(request.value.kind === "prompt" ? value.value : true);
};

const cancel = () => {
  if (!dialog.value) return;
  settleDialog(request.value.kind === "prompt" ? null : false);
};

useEscapeKey(isOpen, cancel);
// Above every sheet's submit (priority 1): Ctrl/⌘+Enter answers the dialog.
usePrimaryAction(isOpen, confirm, 2);
</script>
