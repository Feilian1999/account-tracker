import type { Category } from "./types";

export const defaultCategories: Category[] = [
  { id: "e1", name: "飲食", type: "expense", icon: "restaurant", color: "blue", isDefault: true },
  { id: "e2", name: "交通", type: "expense", icon: "directions_car", color: "green", isDefault: true },
  { id: "e3", name: "購物", type: "expense", icon: "shopping_bag", color: "purple", isDefault: true },
  { id: "e4", name: "娛樂", type: "expense", icon: "sports_esports", color: "red", isDefault: true },
  { id: "e5", name: "住宿", type: "expense", icon: "hotel", color: "indigo", isDefault: true },
  { id: "e6", name: "景點", type: "expense", icon: "attractions", color: "pink", isDefault: true },
  { id: "e7", name: "繳費", type: "expense", icon: "receipt_long", color: "gray", isDefault: true },
  { id: "e8", name: "其他", type: "expense", icon: "more_horiz", color: "gray", isDefault: true },
  { id: "i1", name: "薪水", type: "income", icon: "payments", color: "green", isDefault: true },
  { id: "i2", name: "零用錢", type: "income", icon: "savings", color: "red", isDefault: true },
  { id: "i3", name: "獎金", type: "income", icon: "emoji_events", color: "yellow", isDefault: true },
  { id: "i4", name: "其他", type: "income", icon: "more_horiz", color: "gray", isDefault: true },
];
