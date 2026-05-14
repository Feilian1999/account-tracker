import type { RecordItem } from "../stores/types";

export interface MemberCategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

/**
 * Computes per-category expense breakdown for a given member.
 * @param allMemberIds - All member IDs in the book; required when any record uses splitAmongIds: ["all"]
 */
export function calcMemberCategoryBreakdown(
  records: RecordItem[],
  allMemberIds: string[],
  memberId: string
): MemberCategoryBreakdown[] {
  const categoryTotals = new Map<string, { amount: number; count: number }>();

  for (const record of records) {
    if (record.type !== "expense") continue;

    const splitIds = record.splitAmongIds.includes("all")
      ? allMemberIds
      : record.splitAmongIds;

    if (!splitIds.includes(memberId)) continue;

    const share =
      record.splitCustomAmounts?.[memberId] !== undefined
        ? record.splitCustomAmounts[memberId]
        : record.amount / splitIds.length;

    const entry = categoryTotals.get(record.category) ?? { amount: 0, count: 0 };
    entry.amount += share;
    entry.count += 1;
    categoryTotals.set(record.category, entry);
  }

  return [...categoryTotals.entries()]
    .map(([category, data]) => ({
      category,
      // round to nearest whole unit for display
      amount: Math.round(data.amount),
      count: data.count,
    }))
    .filter((item) => item.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}
