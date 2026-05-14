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
