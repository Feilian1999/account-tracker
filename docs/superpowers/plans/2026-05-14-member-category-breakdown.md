# Member Category Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在共享帳本結算 Sheet 的成員卡片加上點擊功能，開啟新的 Bottom Sheet 顯示該成員各消費分類的應付金額明細。

**Architecture:** 新增純函式 `calcMemberCategoryBreakdown` 處理計算邏輯（可獨立測試），Store 包裝為 `getMemberCategoryBreakdown`，新元件 `MemberCategorySheet` 負責展示，`BookSettlementSheet` 負責觸發與資料轉換。

**Tech Stack:** Vue 3, TypeScript, Pinia, Tailwind CSS v4, vue-i18n, Vitest

> **Note:** Vitest requires Node >=20.19.0. Current environment may have Node 20.6.0. Run `node --version` first; if below 20.19.0, use `nvm use 20` or upgrade before running tests.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/utils/memberBreakdown.ts` | 純計算函式，無外部依賴 |
| Create | `tests/member-breakdown.test.ts` | Unit tests for the above |
| Modify | `src/stores/books.ts` | 加入 `getMemberCategoryBreakdown` wrapper |
| Modify | `src/locales/zh-TW.ts` | 新增 2 個 i18n key |
| Modify | `src/locales/en.ts` | 新增 2 個 i18n key |
| Create | `src/components/books/MemberCategorySheet.vue` | 展示成員分類明細的 Bottom Sheet |
| Modify | `src/components/books/BookSettlementSheet.vue` | 加入點擊觸發與資料轉換邏輯 |

---

## Task 1: 純計算函式 + 單元測試

**Files:**
- Create: `src/utils/memberBreakdown.ts`
- Create: `tests/member-breakdown.test.ts`

- [ ] **Step 1: 建立 `src/utils/memberBreakdown.ts`**

```typescript
import type { RecordItem } from "../stores/types";

export interface MemberCategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

export function calcMemberCategoryBreakdown(
  records: RecordItem[],
  allMemberIds: string[],
  memberId: string
): MemberCategoryBreakdown[] {
  const map = new Map<string, { amount: number; count: number }>();

  for (const record of records) {
    if (record.type !== "expense") continue;

    const splitIds = record.splitAmongIds.includes("all")
      ? allMemberIds
      : record.splitAmongIds;

    if (!splitIds.includes(memberId)) continue;

    let share: number;
    if (
      record.splitCustomAmounts &&
      record.splitCustomAmounts[memberId] !== undefined
    ) {
      share = record.splitCustomAmounts[memberId];
    } else if (splitIds.length > 0) {
      share = record.amount / splitIds.length;
    } else {
      continue;
    }

    const entry = map.get(record.category) ?? { amount: 0, count: 0 };
    entry.amount += share;
    entry.count += 1;
    map.set(record.category, entry);
  }

  return [...map.entries()]
    .map(([category, data]) => ({
      category,
      amount: Math.round(data.amount),
      count: data.count,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
```

- [ ] **Step 2: 建立 `tests/member-breakdown.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { calcMemberCategoryBreakdown } from "../src/utils/memberBreakdown";
import type { RecordItem } from "../src/stores/types";

const makeRecord = (overrides: Partial<RecordItem> = {}): RecordItem => ({
  id: "r1",
  bookId: "book1",
  type: "expense",
  amount: 100,
  category: "food",
  date: "2026-01-01",
  note: "",
  paidById: "m1",
  splitAmongIds: ["m1", "m2"],
  ...overrides,
});

const ALL_MEMBERS = ["m1", "m2", "m3"];

describe("calcMemberCategoryBreakdown", () => {
  it("returns empty array when member has no shared records", () => {
    const records = [makeRecord({ splitAmongIds: ["m2", "m3"] })];
    expect(calcMemberCategoryBreakdown(records, ALL_MEMBERS, "m1")).toEqual([]);
  });

  it("calculates equal split correctly", () => {
    const records = [
      makeRecord({ amount: 300, category: "food", splitAmongIds: ["m1", "m2", "m3"] }),
    ];
    const result = calcMemberCategoryBreakdown(records, ALL_MEMBERS, "m1");
    expect(result).toEqual([{ category: "food", amount: 100, count: 1 }]);
  });

  it("expands 'all' splitAmongIds to all members", () => {
    const records = [
      makeRecord({ amount: 300, category: "transport", splitAmongIds: ["all"] }),
    ];
    const result = calcMemberCategoryBreakdown(records, ALL_MEMBERS, "m1");
    expect(result).toEqual([{ category: "transport", amount: 100, count: 1 }]);
  });

  it("uses splitCustomAmounts when provided", () => {
    const records = [
      makeRecord({
        amount: 100,
        category: "hotel",
        splitAmongIds: ["m1", "m2"],
        splitCustomAmounts: { m1: 60, m2: 40 },
      }),
    ];
    const result = calcMemberCategoryBreakdown(records, ALL_MEMBERS, "m1");
    expect(result).toEqual([{ category: "hotel", amount: 60, count: 1 }]);
  });

  it("groups multiple records of same category and accumulates count", () => {
    const records = [
      makeRecord({ id: "r1", amount: 100, category: "food", splitAmongIds: ["m1", "m2"] }),
      makeRecord({ id: "r2", amount: 200, category: "food", splitAmongIds: ["m1", "m2"] }),
    ];
    const result = calcMemberCategoryBreakdown(records, ALL_MEMBERS, "m1");
    expect(result).toEqual([{ category: "food", amount: 150, count: 2 }]);
  });

  it("sorts results by amount descending", () => {
    const records = [
      makeRecord({ id: "r1", amount: 100, category: "food", splitAmongIds: ["m1"] }),
      makeRecord({ id: "r2", amount: 300, category: "transport", splitAmongIds: ["m1"] }),
      makeRecord({ id: "r3", amount: 200, category: "hotel", splitAmongIds: ["m1"] }),
    ];
    const result = calcMemberCategoryBreakdown(records, ALL_MEMBERS, "m1");
    expect(result.map((r) => r.category)).toEqual(["transport", "hotel", "food"]);
  });

  it("ignores income records", () => {
    const records = [
      makeRecord({ type: "income", amount: 500, category: "food", splitAmongIds: ["m1"] }),
    ];
    expect(calcMemberCategoryBreakdown(records, ALL_MEMBERS, "m1")).toEqual([]);
  });

  it("returns empty array when records list is empty", () => {
    expect(calcMemberCategoryBreakdown([], ALL_MEMBERS, "m1")).toEqual([]);
  });
});
```

- [ ] **Step 3: 確認 npm install 且 Node 版本正確後執行測試**

```bash
cd ~/personal-project/account-tracker
node --version   # 需要 >=20.19.0
npm install
npm test
```

Expected: 所有 7 個新 test 通過，既有 test 不受影響。

- [ ] **Step 4: Commit**

```bash
cd ~/personal-project/account-tracker
git add src/utils/memberBreakdown.ts tests/member-breakdown.test.ts
git commit -m "feat: add calcMemberCategoryBreakdown pure utility with tests"
```

---

## Task 2: Store wrapper + i18n keys

**Files:**
- Modify: `src/stores/books.ts`
- Modify: `src/locales/zh-TW.ts`
- Modify: `src/locales/en.ts`

- [ ] **Step 1: 在 `src/stores/books.ts` 加入 import**

在檔案最上方的 import 區塊（第 1–4 行附近）加入：

```typescript
import { calcMemberCategoryBreakdown } from "../utils/memberBreakdown";
```

- [ ] **Step 2: 在 `src/stores/books.ts` 加入 `getMemberCategoryBreakdown` function**

在 `settlements` computed 的下方（約第 406 行後、`return {` 之前）加入：

```typescript
  const getMemberCategoryBreakdown = (memberId: string) => {
    if (!currentBook.value) return [];
    const allMemberIds = currentBook.value.members.map((m) => m.id);
    return calcMemberCategoryBreakdown(currentBookRecords.value, allMemberIds, memberId);
  };
```

- [ ] **Step 3: 將 `getMemberCategoryBreakdown` 加入 return 物件**

在 `return {` 區塊中，`settlements,` 的下方加入：

```typescript
    getMemberCategoryBreakdown,
```

- [ ] **Step 4: 在 `src/locales/zh-TW.ts` 新增 i18n key**

在 `settlementSheet` 物件的 `giveTo: "給",` 後加入：

```typescript
    memberCategoryTitle: "消費分類明細",
    noExpense: "這位成員沒有任何分攤消費",
```

- [ ] **Step 5: 在 `src/locales/en.ts` 新增 i18n key**

在 `settlementSheet` 物件的 `giveTo: "to",` 後加入：

```typescript
    memberCategoryTitle: "Spending Breakdown",
    noExpense: "No shared expenses for this member",
```

- [ ] **Step 6: Commit**

```bash
cd ~/personal-project/account-tracker
git add src/stores/books.ts src/locales/zh-TW.ts src/locales/en.ts
git commit -m "feat: expose getMemberCategoryBreakdown from store and add i18n keys"
```

---

## Task 3: 建立 `MemberCategorySheet.vue`

**Files:**
- Create: `src/components/books/MemberCategorySheet.vue`

- [ ] **Step 1: 建立元件**

```vue
<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="member.name"
    :subtitle="$t('settlementSheet.memberCategoryTitle')"
    maxHeight="max-h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="px-4 py-6"
  >
    <div
      v-if="categoryItems.length === 0"
      class="flex flex-col items-center justify-center py-16"
    >
      <div
        class="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-3xl dark:bg-gray-800"
      >
        <CategoryIcon name="receipt_long" class="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p class="text-sm font-medium text-gray-400 dark:text-gray-500">
        {{ $t("settlementSheet.noExpense") }}
      </p>
    </div>
    <CategoryBreakdown
      v-else
      :data="categoryItems"
      :total="total"
      activeTab="expense"
    />
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from "../BaseBottomSheet.vue";
import CategoryBreakdown from "../statistics/CategoryBreakdown.vue";
import CategoryIcon from "../CategoryIcon.vue";
import type { CategoryBreakdownItem } from "../statistics/CategoryBreakdown.vue";
import type { Member } from "../../stores/types";

defineProps<{
  modelValue: boolean;
  member: Member;
  categoryItems: CategoryBreakdownItem[];
  total: number;
}>();

defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>
```

- [ ] **Step 2: Commit**

```bash
cd ~/personal-project/account-tracker
git add src/components/books/MemberCategorySheet.vue
git commit -m "feat: add MemberCategorySheet component"
```

---

## Task 4: 修改 `BookSettlementSheet.vue`

**Files:**
- Modify: `src/components/books/BookSettlementSheet.vue`

- [ ] **Step 1: 替換 `<script setup>` 為完整新版本**

將 `<script setup lang="ts">` 整個區塊替換為：

```vue
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
```

- [ ] **Step 2: 修改成員卡片 template — 加入點擊效果與 chevron icon**

將成員卡片的外層 `<div>` 從：

```html
<div
  v-for="stat in memberStats"
  :key="stat.member.id"
  class="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-800"
>
```

替換為：

```html
<div
  v-for="stat in memberStats"
  :key="stat.member.id"
  class="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-[0.98] dark:border-gray-800 dark:bg-gray-800"
  @click="openMemberCategory(stat.member)"
>
```

- [ ] **Step 3: 在成員卡片的 avatar+name 行加入 chevron icon**

將成員 avatar+name 的 `<div class="mb-3 flex items-center gap-3">` 內部：

```html
<div class="mb-3 flex items-center gap-3">
  <div
    class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
  >
    {{ stat.member.name.charAt(0) }}
  </div>
  <span class="font-bold text-gray-800 dark:text-gray-200">{{
    stat.member.name
  }}</span>
</div>
```

替換為：

```html
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
```

- [ ] **Step 4: 在 template 的 `</BaseBottomSheet>` 前加入 `MemberCategorySheet`**

在 `</BaseBottomSheet>` 的前一行插入：

```html
    <MemberCategorySheet
      v-if="selectedMember"
      v-model="showMemberCategory"
      :member="selectedMember"
      :categoryItems="selectedMemberCategoryItems"
      :total="selectedMemberTotal"
    />
```

- [ ] **Step 5: Commit**

```bash
cd ~/personal-project/account-tracker
git add src/components/books/BookSettlementSheet.vue
git commit -m "feat: open member category breakdown on settlement card click"
```

---

## Task 5: 手動驗證

- [ ] **Step 1: 啟動 dev server**

```bash
cd ~/personal-project/account-tracker
npm run dev
```

開啟 `http://localhost:5173`。

- [ ] **Step 2: 驗證正常流程**

1. 進入「帳本」頁面，選擇一個有多筆消費紀錄的帳本
2. 點擊「結算」按鈕，開啟 BookSettlementSheet
3. 確認每個成員卡片右上角有 `chevron_right` icon，游標改為 pointer
4. 點擊任一成員卡片 → 應開啟 MemberCategorySheet
5. 確認 Sheet 標題為成員名稱，副標題為「消費分類明細」
6. 確認各 category 的金額加總 = 該成員在結算頁的「應付」金額
7. 確認 category icon 與顏色和 Statistics 頁一致（主題色正確）

- [ ] **Step 3: 驗證邊界情況**

1. 測試一個沒有任何消費分攤的成員 → 應顯示空狀態文字「這位成員沒有任何分攤消費」
2. 在深色主題下開啟 → 所有元素應正確套用 dark mode 樣式
3. 關閉 MemberCategorySheet 後再次點擊另一位成員 → 應顯示正確成員的資料

- [ ] **Step 4: Commit（若有任何 hotfix）**

```bash
cd ~/personal-project/account-tracker
git add -p
git commit -m "fix: <describe the fix>"
```
