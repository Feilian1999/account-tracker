import {
  emptyDoc,
  mergeDoc,
  type Doc,
  type Entity,
} from "../../src/utils/crdt";
import type { SharedBookPayload } from "../../src/stores/types";

/**
 * In-memory stand-in for /api/shared/v2 with the backend's rules: per-entity
 * register merge, `_v` = version at which the entity last changed, responses
 * carry entities with `_v > since`, a v1 space starts from the client's base.
 */
type Space = {
  doc: Doc | null;
  version: number;
  legacy?: SharedBookPayload & { deletedIds?: string[] };
};

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export function createFakeServer() {
  const spaces = new Map<string, Space>();
  let codes = 0;
  const requests: { kind: string; code: string; body?: unknown }[] = [];
  /** Hold the next sync until release() — to interleave edits with a request. */
  let gate: Promise<void> | null = null;
  let gateCode: string | undefined;
  let release = () => {};

  const hash = (space: Space) => JSON.stringify(space.legacy);

  const since = (space: Space, n: number) => {
    const out: Doc = emptyDoc();
    const doc = space.doc!;
    if (doc.book && (doc.book._v ?? 0) > n) out.book = clone(doc.book);
    for (const key of ["members", "records"] as const) {
      for (const [id, e] of Object.entries(doc[key])) {
        if ((e._v ?? 0) > n) out[key][id] = clone(e);
      }
    }
    return out;
  };

  const mergeInto = (space: Space, changes: Doc, all = false) => {
    const next = space.version + 1;
    let changed = false;
    const one = (
      target: Doc,
      part: Partial<Doc>,
      stamp: (e: Entity) => void,
    ) => {
      if (
        mergeDoc(target, { members: {}, records: {}, ...clone(part) }) ||
        all
      ) {
        stamp(target as unknown as Entity);
        changed = true;
      }
    };
    const doc = space.doc!;
    if (changes.book)
      one(doc, { book: changes.book }, () => (doc.book!._v = next));
    for (const key of ["members", "records"] as const) {
      for (const [id, e] of Object.entries(changes[key] ?? {})) {
        one(
          doc,
          { [key]: { [id]: e } } as Partial<Doc>,
          () => (doc[key][id]._v = next),
        );
      }
    }
    if (changed) space.version = next;
  };

  const api = {
    createSharedDoc: async (doc: Doc) => {
      const code = `CODE${String(++codes).padStart(4, "0")}`;
      const space: Space = { doc: emptyDoc(), version: 0 };
      mergeInto(space, doc, true);
      spaces.set(code, space);
      requests.push({ kind: "create", code });
      return { data: { code, version: space.version } };
    },
    getSharedDoc: async (code: string, n = 0) => {
      const space = spaces.get(code);
      requests.push({ kind: "get", code });
      if (!space)
        throw Object.assign(new Error("404"), { response: { status: 404 } });
      if (!space.doc)
        return {
          data: {
            version: 0,
            legacy: clone(space.legacy!),
            legacyHash: hash(space),
          },
        };
      return { data: { version: space.version, doc: since(space, n) } };
    },
    syncSharedDoc: async (
      code: string,
      body: { since: number; changes: Doc; base?: Doc; baseOf?: string },
    ) => {
      requests.push({ kind: "sync", code, body: clone(body) });
      if (gate && (!gateCode || gateCode === code)) {
        const g = gate;
        gate = null;
        await g;
      }
      const space = spaces.get(code);
      if (!space)
        throw Object.assign(new Error("404"), { response: { status: 404 } });
      if (!space.doc) {
        // Like the backend: the base must come from the payload as it is now.
        if (!body.base || body.baseOf !== hash(space))
          throw Object.assign(new Error("409"), {
            response: {
              status: 409,
              data: {
                error: "base_required",
                legacy: clone(space.legacy!),
                legacyHash: hash(space),
              },
            },
          });
        space.doc = emptyDoc();
        mergeInto(space, body.base, true);
      }
      mergeInto(space, body.changes);
      return {
        data: { version: space.version, doc: since(space, body.since) },
      };
    },
  };

  return {
    api,
    spaces,
    requests,
    /** A space in the v1 format, as an old client left it. */
    seedLegacy(code: string, legacy: Space["legacy"]) {
      spaces.set(code, { doc: null, version: 0, legacy: clone(legacy) });
    },
    /** An old (v1) client writing to a not-yet-upgraded space. */
    v1Write(
      code: string,
      mutate: (legacy: NonNullable<Space["legacy"]>) => void,
    ) {
      const space = spaces.get(code)!;
      if (space.doc) throw new Error("409 upgrade_required");
      mutate(space.legacy!);
    },
    /** Holds the next sync (of `code`, if given) until the returned release(). */
    holdNextSync(code?: string) {
      gateCode = code;
      gate = new Promise((r) => (release = r));
      return () => release();
    },
  };
}
