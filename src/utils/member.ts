import type { Member, RecordItem, UserProfile } from "../stores/types";

/**
 * A member row being edited (create/edit book). Every row carries a real id —
 * existing members keep theirs, new rows get a fresh UUID up front (so the
 * avatar colour doesn't change on save). The store treats an id it already has
 * as a rename and any other id as a new member; nothing is matched by name.
 */
export interface MemberDraft {
  id: string;
  name: string;
  userId?: string;
}

/**
 * Avatar colours. Literal class strings so Tailwind generates them; -100/-800
 * shades on purpose, because the sheep theme (style.css) re-colours the -50
 * backgrounds and several -600/-700 texts and would make every avatar alike.
 */
const AVATAR_COLORS = [
  "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
];

/** Stable colour per member id, so a member looks the same everywhere. */
export function memberColor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** First character (not UTF-16 unit, so emoji/CJK work), uppercased. */
export function memberInitial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : "?";
}

/**
 * Whether `member` is this device's user. Matches the public memberId, or the
 * backup id that membership used before the two were decoupled.
 */
export function isSelf(
  member: Pick<Member, "userId">,
  profile: Pick<UserProfile, "id" | "memberId">,
): boolean {
  if (!member.userId) return false;
  return (
    member.userId === profile.memberId ||
    (!!profile.id && member.userId === profile.id)
  );
}

/**
 * Records of `bookId` that involve `memberId`: paid by them, split among them
 * (including legacy "all" splits, which cover every member) or in a custom
 * split. Removing such a member would rewrite history, so the editor blocks it.
 */
export function memberRecordCount(
  records: RecordItem[],
  bookId: string,
  memberId: string,
): number {
  return records.filter(
    (r) =>
      r.bookId === bookId &&
      (r.paidById === memberId ||
        r.splitAmongIds.includes(memberId) ||
        r.splitAmongIds.includes("all") ||
        (r.splitCustomAmounts !== undefined &&
          memberId in r.splitCustomAmounts)),
  ).length;
}

const normalize = (name: string) => name.trim().toLowerCase();

export interface MemberIssues {
  /** Row ids whose name is blank. */
  empty: Set<string>;
  /** Row ids whose name repeats another row's (case-insensitive). */
  duplicate: Set<string>;
}

/**
 * Names must be non-empty and unique: joining a shared book links the joiner to
 * a member by name, and two identical names are indistinguishable in splits.
 */
export function validateMembers(drafts: MemberDraft[]): MemberIssues {
  const empty = new Set<string>();
  const duplicate = new Set<string>();
  const seen = new Map<string, string>();
  for (const d of drafts) {
    const n = normalize(d.name);
    if (!n) {
      empty.add(d.id);
      continue;
    }
    const other = seen.get(n);
    if (other) {
      duplicate.add(d.id);
      duplicate.add(other);
    } else {
      seen.set(n, d.id);
    }
  }
  return { empty, duplicate };
}

export const hasDuplicateName = (drafts: MemberDraft[], name: string) =>
  drafts.some((d) => normalize(d.name) === normalize(name));
