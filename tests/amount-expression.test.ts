import { describe, expect, it } from "vitest";
import { parseAmountExpression } from "../src/utils/amountExpression";

describe("parseAmountExpression", () => {
  it("evaluates arithmetic expressions", () => {
    expect(parseAmountExpression("500 + 250 * 2")).toBe(1000);
    expect(parseAmountExpression("(500 + 250) * 2")).toBe(1500);
  });

  it("accepts comma-formatted numbers", () => {
    expect(parseAmountExpression("1,000")).toBe(1000);
    expect(parseAmountExpression("1,000 + 2,500.5")).toBe(3500.5);
  });

  it("evaluates percentages against the provided total", () => {
    expect(parseAmountExpression("20%", 1000)).toBe(200);
    expect(parseAmountExpression("12.5%", 2400)).toBe(300);
  });

  it("rejects invalid or non-finite expressions", () => {
    expect(parseAmountExpression("")).toBeNull();
    expect(parseAmountExpression("100 dollars")).toBeNull();
    expect(parseAmountExpression("100 / 0")).toBeNull();
    expect(parseAmountExpression("20%")).toBeNull();
  });
});
