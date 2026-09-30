import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { Book, RecordItem, UserProfile } from "../src/stores/types";

const api = vi.hoisted(() => ({
  shareBookToCloud: vi.fn(),
  fetchSharedBook: vi.fn(),
  updateSharedBook: vi.fn(async () => ({ data: { status: "ok" } })),
}));
vi.mock("../src/utils/api", () => api);

import { setupBookActions } from "../src/stores/books";

const setup = () => {
  const books = ref<Book[]>([
    { id: "b1", name: "Trip", members: [], createdAt: "2026-09-30T00:00:00Z" },
  ]);
  const actions = setupBookActions(
    books,
    ref<RecordItem[]>([]),
    ref<string | null>(null),
    ref<UserProfile>({
      id: "s",
      memberId: "m",
      name: "Me",
      theme: "sheep",
      animations: false,
    }),
    ref<string[]>([]),
    ref<string[]>([]),
    ref<string[]>([]),
    vi.fn(async () => {}),
  );
  return { books, ...actions };
};

describe("publishBook", () => {
  it("sends one share request for concurrent taps and returns the same code", async () => {
    const codes = ["AAAA2222", "BBBB3333"];
    let resolveFirst!: (v: unknown) => void;
    api.shareBookToCloud.mockImplementationOnce(
      () =>
        new Promise(
          (r) => (resolveFirst = () => r({ data: { code: codes[0] } })),
        ),
    );
    api.shareBookToCloud.mockResolvedValue({ data: { code: codes[1] } });

    const store = setup();
    const first = store.publishBook("b1");
    const second = store.publishBook("b1"); // second tap while the first is pending
    resolveFirst(undefined);

    expect(await first).toBe("AAAA2222");
    expect(await second).toBe("AAAA2222");
    expect(api.shareBookToCloud).toHaveBeenCalledOnce();
    expect(store.books.value[0].shareCode).toBe("AAAA2222");

    // Once shared, later taps reuse the code instead of creating a new space.
    expect(await store.publishBook("b1")).toBe("AAAA2222");
    expect(api.shareBookToCloud).toHaveBeenCalledOnce();
  });

  it("allows a retry after a failed share", async () => {
    api.shareBookToCloud.mockReset();
    api.shareBookToCloud.mockRejectedValueOnce(new Error("offline"));
    api.shareBookToCloud.mockResolvedValueOnce({ data: { code: "CCCC4444" } });
    const store = setup();
    await expect(store.publishBook("b1")).rejects.toThrow("offline");
    expect(await store.publishBook("b1")).toBe("CCCC4444");
  });
});
