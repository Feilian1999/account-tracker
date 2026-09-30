import type {
  CurrencyCode,
  Member,
  RecordItem,
  Settlement,
} from "../stores/types";
import { splitEvenly } from "./currency";

export interface MemberStat {
  member: Member;
  paid: number;
  owed: number;
  net: number;
}

/**
 * Per-member paid/owed/net for a book, in the book currency. Accumulates in
 * integer cents so per-record shares sum EXACTLY to the amount and every
 * member's net cancels out. Equal splits are divided in the currency's minor
 * unit (whole yen/dong/NT$), remainder to the first members.
 */
export function calcMemberStats(
  members: Member[],
  records: RecordItem[],
  currency: CurrencyCode,
): MemberStat[] {
  const allMemberIds = members.map((m) => m.id);
  const paidCents: Record<string, number> = {};
  const owedCents: Record<string, number> = {};
  members.forEach((m) => {
    paidCents[m.id] = 0;
    owedCents[m.id] = 0;
  });

  records.forEach((r) => {
    if (r.type !== "expense") return;

    if (paidCents[r.paidById] !== undefined) {
      paidCents[r.paidById] += Math.round(r.amount * 100);
    }

    if (r.splitCustomAmounts) {
      Object.entries(r.splitCustomAmounts).forEach(([memberId, amount]) => {
        if (owedCents[memberId] !== undefined) {
          owedCents[memberId] += Math.round(amount * 100);
        }
      });
    } else {
      const splitIds = (
        r.splitAmongIds.includes("all") ? allMemberIds : r.splitAmongIds
      ).filter((id) => owedCents[id] !== undefined);
      splitEvenly(r.amount, splitIds.length, currency).forEach((share, i) => {
        owedCents[splitIds[i]] += Math.round(share * 100);
      });
    }
  });

  return members.map((member) => {
    const paid = paidCents[member.id] || 0;
    const owed = owedCents[member.id] || 0;
    return {
      member,
      paid: paid / 100,
      owed: owed / 100,
      net: (paid - owed) / 100,
    };
  });
}

/** Greedy creditor/debtor matching over the members' nets. */
export function calcSettlements(stats: MemberStat[]): Settlement[] {
  const balances = stats.map((s) => ({ member: s.member, net: s.net }));
  const creditors = balances
    .filter((b) => b.net > 0)
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < 0)
    .sort((a, b) => a.net - b.net);
  const result: Settlement[] = [];
  let ci = 0;
  let di = 0;
  // Use a sub-cent epsilon for comparisons so floating-point residue does not
  // leave phantom debts/credits that never clear.
  const EPS = 0.005;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.net, -debt.net);
    if (amount > EPS) {
      result.push({
        from: debt.member,
        to: credit.member,
        amount: Math.round(amount * 100) / 100,
      });
    }
    credit.net -= amount;
    debt.net += amount;
    if (credit.net <= EPS) ci++;
    if (debt.net >= -EPS) di++;
  }
  return result;
}
