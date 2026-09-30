import { describe, expect, it } from "vitest";
import { calcMemberStats, calcSettlements } from "../src/utils/settlement";
import type { Member, RecordItem } from "../src/stores/types";

const members: Member[] = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];

const expense = (overrides: Partial<RecordItem>): RecordItem => ({
  id: crypto.randomUUID(),
  bookId: "book",
  type: "expense",
  amount: 0,
  category: "food",
  date: "2026-09-30",
  note: "",
  paidById: "a",
  splitAmongIds: ["a", "b", "c"],
  ...overrides,
});

const netSum = (stats: { net: number }[]) =>
  Math.round(stats.reduce((s, m) => s + m.net, 0) * 100);

describe("calcMemberStats", () => {
  it("splits a JPY expense in whole yen and nets cancel out", () => {
    const stats = calcMemberStats(members, [expense({ amount: 1000 })], "JPY");
    expect(stats.map((s) => s.owed)).toEqual([334, 333, 333]);
    expect(netSum(stats)).toBe(0);
  });

  it("keeps 2-decimal splits for USD", () => {
    const stats = calcMemberStats(members, [expense({ amount: 100 })], "USD");
    expect(stats.map((s) => s.owed)).toEqual([33.34, 33.33, 33.33]);
  });

  it("stays exact for legacy TWD amounts with decimals", () => {
    const stats = calcMemberStats(
      members,
      [expense({ amount: 10.99, splitAmongIds: ["all"] })],
      "TWD",
    );
    expect(stats.reduce((s, m) => s + m.owed, 0)).toBeCloseTo(10.99, 10);
    expect(netSum(stats)).toBe(0);
  });

  it("uses custom amounts as stored (book currency)", () => {
    const stats = calcMemberStats(
      members,
      [
        expense({
          amount: 652,
          splitCustomAmounts: { a: 218, b: 217, c: 217 },
        }),
      ],
      "TWD",
    );
    expect(stats.map((s) => s.owed)).toEqual([218, 217, 217]);
    expect(netSum(stats)).toBe(0);
  });

  it("ignores income and unknown members", () => {
    const stats = calcMemberStats(
      members,
      [
        expense({ type: "income", amount: 500 }),
        expense({
          amount: 90,
          paidById: "ghost",
          splitAmongIds: ["b", "ghost"],
        }),
      ],
      "TWD",
    );
    expect(stats.find((s) => s.member.id === "b")?.owed).toBe(90);
    expect(stats.every((s) => s.paid === 0)).toBe(true);
  });
});

describe("calcSettlements", () => {
  it("settles a JPY book to zero", () => {
    const stats = calcMemberStats(
      members,
      [
        expense({ amount: 1000, paidById: "a" }),
        expense({ amount: 500, paidById: "b" }),
      ],
      "JPY",
    );
    const transfers = calcSettlements(stats);
    const received: Record<string, number> = {};
    transfers.forEach((t) => {
      received[t.to.id] = (received[t.to.id] ?? 0) + t.amount;
      received[t.from.id] = (received[t.from.id] ?? 0) - t.amount;
    });
    stats.forEach((s) =>
      expect(received[s.member.id] ?? 0).toBeCloseTo(s.net, 10),
    );
  });
});
