# Member Category Breakdown — Design Spec

**Date:** 2026-05-14
**Feature:** 結算頁成員消費分類明細

---

## Overview

在共享帳本的結算 Sheet（`BookSettlementSheet.vue`）中，點擊成員卡片時，彈出一個新的 Bottom Sheet，顯示該成員在這個帳本中，各消費分類的應付金額明細。

---

## Data & Computation

在 `src/stores/books.ts` 的 `setupBookActions` 中，新增 function：

```
getMemberCategoryBreakdown(memberId: string): { category: string, amount: number }[]
```

計算邏輯（與現有 `memberStats` 保持一致）：

1. 遍歷 `currentBookRecords` 中所有 `type === "expense"` 的 record
2. 解析有效的 splitIds：`splitAmongIds` 包含 `"all"` 時展開為所有成員 ID
3. 若 `memberId` 在 splitIds 中：
   - 若有 `splitCustomAmounts[memberId]` → 取該值
   - 否則 → `record.amount / splitIds.length`（平均分攤）
4. 依 `record.category` 累加金額
5. 回傳結果依金額由高到低排序

---

## Components

### 新增：`src/components/books/MemberCategorySheet.vue`

- 使用 `BaseBottomSheet`
- Props:
  - `modelValue: boolean`
  - `member: Member`
  - `bookName: string`
  - `categoryItems: CategoryBreakdownItem[]`
  - `total: number`
- 標題：成員名稱
- 副標題：帳本名稱
- 內容：
  - 有資料時：複用 `CategoryBreakdown` component（`activeTab` 固定為 `'expense'`）
  - 無資料時：顯示空狀態文字（`settlementSheet.noExpense`）

### 修改：`src/components/books/BookSettlementSheet.vue`

- 成員卡片（`v-for="stat in memberStats"`）加上：
  - `cursor-pointer`
  - `hover:shadow-md`（與 settlement suggestions 一致）
  - 右下角加 `chevron_right` icon
- 點擊後：設定 `selectedMember`，開啟 `MemberCategorySheet`
- 在 template 底部加入 `MemberCategorySheet`，傳入計算好的 `categoryItems` 與 `total`

計算 `categoryItems` 的邏輯在 `BookSettlementSheet` 的 `<script setup>` 中，呼叫 `store.getMemberCategoryBreakdown(selectedMember.id)`，並依 `Statistics.vue` 的 `categoryBreakdown` computed 相同方式轉換為 `CategoryBreakdownItem[]`（加入 `localizedName`、`percentage`、`style`）。

---

## i18n

在 `settlementSheet` 命名空間下新增兩個 key：

| Key | zh-TW | en-US |
|-----|-------|-------|
| `settlementSheet.memberCategoryTitle` | `消費分類明細` | `Spending Breakdown` |
| `settlementSheet.noExpense` | `這位成員沒有任何分攤消費` | `No shared expenses for this member` |

其餘文字（分類名稱、總計、record 數量等）沿用 `statistics` 命名空間既有翻譯。

---

## Theme & Style

- Category icon / 顏色樣式：沿用 `colorMap`（與 Statistics 頁一致）
- 成員 avatar：`bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400`（與 BookSettlementSheet 現有樣式一致）
- Bottom Sheet 外觀：與 `BookSettlementSheet` 相同設定（`max-h-[85vh]`、`rounded-t-[2rem]`）
