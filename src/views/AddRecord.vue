<template>
  <div class="page-container">
    <!-- Header -->
    <div class="header-nav sticky top-0 z-10">
      <button
        type="button"
        @click="router.back()"
        class="-ml-2 p-2 text-gray-500 hover:text-gray-800"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="flex-1 text-center font-bold text-gray-800">{{ $t("addRecord.title") }}</h1>
      <div class="w-8"></div>
    </div>

    <!-- No book warning -->
    <div
      v-if="!store.currentBook"
      class="flex flex-col items-center justify-center px-8 py-24 text-center"
    >
      <div class="mb-3 text-5xl">📒</div>
      <p class="font-medium text-gray-600">{{ $t("addRecord.noBook") }}</p>
      <router-link
        to="/books"
        class="mt-4 rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >{{ $t("addRecord.goToBooks") }}</router-link>
    </div>

    <div v-else class="p-4">
      <form @submit.prevent="submitRecord" class="card space-y-5">
        <!-- Expense / Income toggle -->
        <div class="type-toggle-track">
          <button
            type="button"
            @click="form.type = 'expense'"
            :class="[
              'type-toggle-btn',
              form.type === 'expense' ? 'type-toggle-btn--active-expense' : 'type-toggle-btn--inactive',
            ]"
          >{{ $t("addRecord.expenseLabel") }}</button>
          <button
            type="button"
            @click="form.type = 'income'"
            :class="[
              'type-toggle-btn',
              form.type === 'income' ? 'type-toggle-btn--active-income' : 'type-toggle-btn--inactive',
            ]"
          >{{ $t("addRecord.incomeLabel") }}</button>
        </div>

        <!-- Amount -->
        <div>
          <label class="label-text">{{ $t("addRecord.amountLabel") }}</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-gray-400">NT$</span>
            <input
              v-model.number="form.amount"
              type="number"
              min="1"
              required
              placeholder="0"
              class="input-field input-field-icon text-lg font-semibold"
            />
          </div>
        </div>

        <!-- Category -->
        <div>
          <label class="label-text">{{ $t("addRecord.categoryLabel") }}</label>
          <select v-model="form.category" class="input-field">
            <option
              v-for="cat in activeCats"
              :key="cat.id"
              :value="cat.name"
            >
              {{ te(`categories.${cat.id}`) ? t(`categories.${cat.id}`) : cat.name }}
            </option>
          </select>
        </div>

        <!-- Paid By (expense only) -->
        <div v-if="form.type === 'expense'">
          <label class="label-text">{{ $t("addRecord.paidBy") }}</label>
          <select v-model="form.paidById" class="input-field">
            <option v-for="m in store.currentBook.members" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>
        </div>

        <!-- Split Among (expense only) -->
        <div v-if="form.type === 'expense'">
          <div class="mb-1.5 flex items-center justify-between">
            <label class="text-sm font-medium text-gray-600">{{ $t("addRecord.splitAmong") }}</label>
            <button
              type="button"
              @click="toggleAllMembers"
              class="text-xs text-blue-600 hover:underline"
            >
              {{
                form.splitAmongIds.length === store.currentBook.members.length
                  ? $t("addRecord.unselectAll")
                  : $t("addRecord.selectAll")
              }}
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="m in store.currentBook.members"
              :key="m.id"
              type="button"
              @click="toggleMember(m.id)"
              :class="[
                'rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all',
                form.splitAmongIds.includes(m.id)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500',
              ]"
            >
              {{ m.name }}
            </button>
          </div>
          <p
            v-if="form.splitAmongIds.length > 0 && form.amount"
            class="mt-2 text-right text-xs text-gray-400"
          >
            {{ $t("addRecord.perPersonNote", { amount: Math.floor(Number(form.amount) / form.splitAmongIds.length).toLocaleString() }) }}
          </p>
        </div>

        <!-- Date -->
        <div>
          <label class="label-text">{{ $t("addRecord.dateLabel") }}</label>
          <input v-model="form.date" type="date" required class="input-field" />
        </div>

        <!-- Note -->
        <div>
          <label class="label-text">{{ $t("addRecord.noteLabel") }}</label>
          <input
            v-model="form.note"
            type="text"
            :placeholder="$t('addRecord.notePlaceholder')"
            class="input-field"
          />
        </div>

        <BaseButton
          type="submit"
          :disabled="form.type === 'expense' && form.splitAmongIds.length === 0"
        >
          {{ $t("addRecord.saveBtn") }}
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useTrackerStore } from "../stores/tracker";
import { useI18n } from "vue-i18n";
import BaseButton from "../components/BaseButton.vue";

const store = useTrackerStore();
const router = useRouter();
const { t, te } = useI18n();

const today = new Date().toISOString().split("T")[0];
const defaultPaidById = store.currentBook?.members[0]?.id ?? "";
const allMemberIds = store.currentBook?.members.map((m) => m.id) ?? [];

const expenseCats = computed(() => store.allCategories.filter((c) => c.type === "expense"));
const incomeCats = computed(() => store.allCategories.filter((c) => c.type === "income"));
const activeCats = computed(() =>
  form.value.type === "expense" ? expenseCats.value : incomeCats.value,
);

const form = ref({
  type: "expense" as "expense" | "income",
  amount: "" as number | "",
  category: expenseCats.value[0]?.name ?? "",
  paidById: defaultPaidById,
  splitAmongIds: [...allMemberIds],
  date: today,
  note: "",
});

watch(
  () => form.value.type,
  (newType) => {
    const cats = newType === "expense" ? expenseCats.value : incomeCats.value;
    form.value.category = cats[0]?.name ?? "";
  },
);

const toggleMember = (id: string) => {
  const idx = form.value.splitAmongIds.indexOf(id);
  if (idx >= 0) {
    form.value.splitAmongIds.splice(idx, 1);
  } else {
    form.value.splitAmongIds.push(id);
  }
};

const toggleAllMembers = () => {
  const all = store.currentBook?.members.map((m) => m.id) ?? [];
  if (form.value.splitAmongIds.length === all.length) {
    form.value.splitAmongIds = [];
  } else {
    form.value.splitAmongIds = [...all];
  }
};

const submitRecord = () => {
  if (!form.value.amount || Number(form.value.amount) <= 0) return;
  if (!store.currentBook) return;

  const isExpense = form.value.type === "expense";
  if (isExpense && form.value.splitAmongIds.length === 0) return;

  store.addRecord({
    type: form.value.type,
    amount: Number(form.value.amount),
    category: form.value.category,
    date: form.value.date,
    note: form.value.note,
    paidById: isExpense ? form.value.paidById : "",
    splitAmongIds: isExpense ? form.value.splitAmongIds : [],
  });

  router.back();
};
</script>
