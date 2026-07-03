// ============================
// Data Models
// ============================

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
  shareCode?: string;
  isSynced?: boolean;
}

export interface RecordItem {
  id: string;
  bookId: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  date: string;
  note: string;
  paidById: string;
  splitAmongIds: string[];
  splitCustomAmounts?: Record<string, number>; // memberId -> amount, if custom split
  isSynced?: boolean;
}

export interface PersonalRecord {
  id: string;
  type: "expense" | "income";
  amount: number;
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
