import type { PersonalRecord } from "../stores/types";
import { toLocalDateString } from "./date";

interface PiggyCategory {
  id: number;
  name: string;
  type: "expense" | "income";
}

export function parsePiggyBackup(content: string): PersonalRecord[] {
  const sections = content.split("BK#");
  const categories: Record<number, PiggyCategory> = {};
  const rawRecords: any[] = [];
  const parsedRecords: PersonalRecord[] = [];

  for (const section of sections) {
    if (!section.trim()) continue;

    const type = section.charAt(0);
    const lines = section.substring(1).trim().split("\n");

    if (type === "C") {
      // Categories
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          categories[data.a] = {
            id: data.a,
            name: data.c,
            type: data.d === "Expense" ? "expense" : "income",
          };
        } catch (e) {
          console.error("Failed to parse category line:", line);
        }
      }
    } else if (type === "R") {
      // Records
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          rawRecords.push(data);
        } catch (e) {
          console.error("Failed to parse record line:", line);
        }
      }
    }
  }

  // Filter and map records. Validate per-record so one malformed line cannot
  // abort the whole import or poison every total with NaN.
  for (const data of rawRecords) {
    try {
      const amount = typeof data.f === "number" ? data.f : parseFloat(data.f);
      if (!isFinite(amount)) continue;

      const category = categories[data.i];
      const type = data.j === "Expense" ? "expense" : "income";
      const dateString = toLocalDateString(data.c);
      if (!dateString) continue;

      parsedRecords.push({
        id: crypto.randomUUID(),
        type,
        amount,
        category: category?.name || "其他",
        date: dateString,
        note: data.h || "",
      });
    } catch (e) {
      console.error("Failed to convert record:", data, e);
    }
  }

  return parsedRecords;
}
