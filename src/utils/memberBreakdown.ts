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
