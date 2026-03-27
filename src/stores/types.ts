// ============================
// Data Models
// ============================

export interface Member {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
  shareCode?: string;
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
}

export interface PersonalRecord {
  id: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  date: string;
  note: string;
  sourceBookId?: string;
}

export interface RecordTemplate {
  id: string;
  name: string;
  type: "expense" | "income";
  amount: number | null;
  category: string;
  note: string;
}

export interface UserProfile {
  name: string;
  avatar?: string;
  email?: string;
  theme: "light" | "dark" | "system";
  animations: boolean;
  isLoggedIn: boolean;
  authToken?: string;
}

export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string;
  color: string;
  isDefault: boolean;
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
