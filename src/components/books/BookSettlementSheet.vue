<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="$t('settlementSheet.title')"
    :subtitle="bookName"
    maxHeight="max-h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="px-4 py-6"
  >
    <div class="space-y-6">
      <!-- Member Stats -->
      <div>
        <h3
          class="mb-3 px-2 text-sm font-bold text-gray-500 dark:text-gray-400"
        >
          {{ $t("settlementSheet.memberDetailStats") }}
        </h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="stat in memberStats"
            :key="stat.member.id"
            class="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-[0.98] dark:border-gray-800 dark:bg-gray-800"
            @click="openMemberCategory(stat.member)"
          >
            <div class="mb-3 flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
              >
                {{ stat.member.name.charAt(0) }}
              </div>
              <span class="flex-1 font-bold text-gray-800 dark:text-gray-200">{{
                stat.member.name
              }}</span>
              <CategoryIcon
                name="chevron_right"
                class="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500"
              />
            </div>
            <div
              class="flex gap-2 divide-x divide-gray-100 rounded-xl bg-gray-50 p-2 dark:divide-gray-700 dark:bg-gray-900/50"
            >
              <div class="flex-1 text-center">
                <p
                  class="text-[10px] font-bold text-gray-400 dark:text-gray-500"
                >
                  {{ $t("settlementSheet.paid") }}
                </p>
                <p
                  class="mt-0.5 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                  {{ stat.paid.toLocaleString() }}
                </p>
              </div>
              <div class="flex-1 text-center">
                <p
                  class="text-[10px] font-bold text-gray-400 dark:text-gray-500"
                >
                  {{ $t("settlementSheet.owed") }}
                </p>
                <p
                  class="mt-0.5 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                  {{ stat.owed.toLocaleString() }}
                </p>
              </div>
              <div class="flex-1 text-center">
                <p
                  class="text-[10px] font-bold text-gray-400 dark:text-gray-500"
                >
                  {{ $t("settlementSheet.balance") }}
                </p>
                <p
                  :class="[
                    'mt-0.5 text-sm font-bold',
                    stat.net > 0
                      ? 'text-green-600 dark:text-green-400'
                      : stat.net < 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500',
                  ]"
                >
                  {{ stat.net > 0 ? "+" : ""
                  }}{{ stat.net.toLocaleString() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settlement Suggestions -->
      <div>
        <h3
          class="mb-3 flex items-center gap-2 px-2 text-sm font-bold text-gray-500 dark:text-gray-400"
        >
          <CategoryIcon name="payments" class="h-4 w-4 shrink-0" />
          <span>{{ $t("settlementSheet.suggestedTransfers") }}</span>
        </h3>
        <div
          v-if="settlements.length === 0"
          class="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-800"
        >
          <div class="mb-2 flex items-center justify-center">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-3xl bg-green-50 text-3xl text-green-500 dark:bg-green-900/30 dark:text-green-400"
            >
              <CategoryIcon name="celebration" />
            </div>
          </div>
          <p class="text-lg font-bold text-gray-800 dark:text-gray-200">
            {{ $t("settlementSheet.allSettled") }}
          </p>
          <p
            class="mt-1 text-sm font-medium text-gray-400 dark:text-gray-500"
          >
            {{ $t("settlementSheet.noTransfersNeeded") }}
          </p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(s, i) in settlements"
            :key="i"
            class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600 shadow-inner dark:bg-red-900/30 dark:text-red-400 dark:shadow-none"
            >
              {{ s.from.name.charAt(0) }}
            </div>
            <div class="min-w-0 flex-1">
              <p
                class="text-sm font-medium text-gray-500 dark:text-gray-400"
              >
                <span
                  class="text-base font-bold text-gray-800 dark:text-gray-200"
                  >{{ s.from.name }}</span
                >
                {{ $t("settlementSheet.giveTo") }}
                <span
                  class="text-base font-bold text-gray-800 dark:text-gray-200"
                  >{{ s.to.name }}</span
                >
              </p>
            </div>
            <div
              class="shrink-0 rounded-xl bg-orange-50 px-3 py-1.5 text-right dark:bg-orange-900/30"
            >
              <span
                class="text-base font-bold text-orange-600 dark:text-orange-400"
                >NT$ {{ s.amount.toLocaleString() }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <MemberCategorySheet
      v-if="selectedMember"
      v-model="showMemberCategory"
      :member="selectedMember"
      :categoryItems="selectedMemberCategoryItems"
      :total="selectedMemberTotal"
    />
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../../stores/tracker";
import type { Settlement, Member } from "../../stores/tracker";
import type { CategoryBreakdownItem } from "../statistics/CategoryBreakdown.vue";
import { colorMap } from "../../utils/category";
import CategoryIcon from "../CategoryIcon.vue";
import BaseBottomSheet from "../BaseBottomSheet.vue";
import MemberCategorySheet from "./MemberCategorySheet.vue";

const props = defineProps<{
  modelValue: boolean;
  bookName: string;
  memberStats: any[];
  settlements: Settlement[];
}>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
const store = useTrackerStore();
const { te, t } = useI18n();

watch(
  () => props.modelValue,
  (val) => {
    if (val && store.currentBookId) {
      store.pullSharedBook(store.currentBookId);
    }
  }
);

// ---- Member Category Sheet ----
const selectedMember = ref<Member | null>(null);
const showMemberCategory = ref(false);

function openMemberCategory(member: Member) {
  selectedMember.value = member;
  showMemberCategory.value = true;
}

const categoryMap = computed(
  () => new Map(store.allCategories.map((cat) => [cat.name, cat]))
);

function getCategoryStyle(categoryName: string) {
  const cat = categoryMap.value.get(categoryName);
  const color = cat?.color ?? "gray";
  return { icon: cat?.icon ?? "more_horiz", ...(colorMap[color] ?? colorMap.gray) };
}

function getLocalizedName(categoryName: string) {
  const cat = categoryMap.value.get(categoryName);
  if (cat && te(`categories.${cat.id}`)) return t(`categories.${cat.id}`);
  return categoryName;
}

const selectedMemberCategoryItems = computed((): CategoryBreakdownItem[] => {
  if (!selectedMember.value) return [];
  const raw = store.getMemberCategoryBreakdown(selectedMember.value.id);
  const total = raw.reduce((s, item) => s + item.amount, 0);
  if (total === 0) return [];
  return raw.map((item) => ({
    categoryName: item.category,
    localizedName: getLocalizedName(item.category),
    total: item.amount,
    count: item.count,
    percentage: Math.round((item.amount / total) * 100),
    style: getCategoryStyle(item.category),
  }));
});

const selectedMemberTotal = computed(() =>
  selectedMemberCategoryItems.value.reduce((s, item) => s + item.total, 0)
);
</script>
