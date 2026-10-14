import type { Book } from "../stores/types";

/**
 * Whether a book is shared with other members. A book gets its `shareCode`
 * when it is published or joined, before its CRDT replica exists, so the code
 * alone decides — a replica never exists without one.
 */
export function isSharedBook(book: Book): boolean {
  return !!book.shareCode;
}
