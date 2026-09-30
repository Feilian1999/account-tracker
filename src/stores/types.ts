// ============================
// Data Models
// ============================

export type CurrencyCode =
  | "TWD"
  | "JPY"
  | "USD"
  | "THB"
  | "VND"
  | "CNY"
  | "EUR"
  | "KRW"
  | "GBP";

/** What the user typed. */
export interface OriginalAmount {
  amount: number;
  currency: CurrencyCode;
  /** Book records with a custom split: the per-member amounts as typed, in `currency`. */
  splitCustomAmounts?: Record<string, number>;
}

/**
 * How `amount` was derived from the original. "identity" = no conversion;
 * "auto" = fetched for that date; "cached" = nearest cached rate (offline);
 * "manual" = typed by the user.
 */
export interface FxInfo {
  rate: number; // 1 unit of the original currency = `rate` units of the amount currency
  rateDate: string; // YYYY-MM-DD
  source: "auto" | "cached" | "manual" | "identity";
}

/** The value confirmed at entry time. Never recomputed; see utils/currency.ts rebaseRecord. */
export interface BookedAmount {
  amount: number;
  currency: CurrencyCode;
  rate: number;
  rateDate: string;
  rateSource: FxInfo["source"];
}

/**
 * Money fields on records. `amount` is always expressed in `amountCurrency`
 * (missing = TWD, the only currency before multi-currency support), and every
 * total/settlement sums `amount`. `original`/`booked`/`fx` are only present on
 * records that were entered in, or converted to, another currency.
 */
interface RecordMoney {
  amount: number;
  amountCurrency?: CurrencyCode;
  original?: OriginalAmount | null;
  booked?: BookedAmount | null;
  fx?: FxInfo | null;
}

export interface Member {
  id: string;
  name: string;
  userId?: string; // Optional link to actual user ID (even for anonymous users)
}

export interface Book {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
  /** Settlement currency; every record's `amount` is in it. Missing = TWD. */
  currency?: CurrencyCode;
  shareCode?: string;
  isSynced?: boolean;
}

export interface RecordItem extends RecordMoney {
  id: string;
  bookId: string;
  type: "expense" | "income";
  category: string;
  date: string;
  note: string;
  paidById: string;
  splitAmongIds: string[];
  splitCustomAmounts?: Record<string, number>; // memberId -> amount in the book currency, if custom split
  isSynced?: boolean;
}

export interface PersonalRecord extends RecordMoney {
  id: string;
  type: "expense" | "income";
  category: string;
  date: string;
  note: string;
  sourceBookId?: string;
  isSynced?: boolean;
}

export interface RecordTemplate {
  id: string;
  name: string;
  type: "expense" | "income";
  amount: number | null;
  /** Currency of `amount`. Missing = TWD. */
  currency?: CurrencyCode;
  category: string;
  note: string;
  isSynced?: boolean;
}

export interface UserProfile {
  /** Secret backup key (UUID). Used only for cloud backup/restore. Never shared. */
  id: string;
  /** Public identity used to recognise this user inside shared books. Safe to expose. */
  memberId: string;
  name: string;
  theme: "light" | "dark" | "system" | "sheep";
  animations: boolean;
  /** Currency personal records are totalled in. Missing = TWD. */
  baseCurrency?: CurrencyCode;
}

export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string;
  color: string;
  isDefault: boolean;
  isSynced?: boolean;
}

export interface Settlement {
  from: Member;
  to: Member;
  amount: number;
}

// Shared Book API payload/response types
export interface SharedBookPayload {
  book: Book;
  records: RecordItem[];
}

export interface ShareResponse {
  code: string;
}
