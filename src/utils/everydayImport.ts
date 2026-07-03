import type { PersonalRecord } from "../stores/types";

/**
 * Parse a single CSV line into fields, honouring double-quoted values so that a
 * comma inside a note/category (e.g. "lunch, taxi") does not shift every
 * subsequent column and corrupt the amount / type.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

export function parseEverydayCSV(content: string): PersonalRecord[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  // Header: 日期,類別,大類別,金額,貨幣,成員,帳戶,標籤,備註,收支區分,上次更新,UUID
  const records: PersonalRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCsvLine(line);
    if (columns.length < 10) continue;

    const rawDate = columns[0]; // 20260331
    const category = columns[1]; // 交通
    const amount = parseFloat(columns[3]); // 1000
    const note = columns[8]; // SUICA
    const typeIndicator = columns[9]; // 支 / 收

    // Skip rows whose amount column is not a valid number rather than silently
    // importing a corrupted 0 amount.
    if (!isFinite(amount)) continue;

    // Date conversion: 20260331 -> 2026-03-31
    if (rawDate.length < 8) continue;
    const year = rawDate.substring(0, 4);
    const month = rawDate.substring(4, 6);
    const day = rawDate.substring(6, 8);
    const formattedDate = `${year}-${month}-${day}`;

    const type: "expense" | "income" = typeIndicator === "收" ? "income" : "expense";

    records.push({
      id: crypto.randomUUID(),
      type,
      amount,
      category: category || "其他",
      date: formattedDate,
      note: note || "",
    });
  }

  return records;
}
