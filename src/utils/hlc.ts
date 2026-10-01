/**
 * Hybrid Logical Clock (Kulkarni et al.) for the shared-book CRDT.
 *
 * A timestamp is `<ms base36, 10 wide>-<counter base36, 5 wide>-<node>`, so
 * plain string comparison orders them — the backend merges by `a > b` on the
 * strings without parsing. The node id (one per device, not per user: a user
 * restoring a backup on a second device must not share a node) breaks ties.
 *
 * `tick()` stamps a local write; `observe()` folds in every remote timestamp we
 * receive, so a write made after seeing a value always sorts after it even if
 * this device's wall clock is behind. The clock state is persisted so a device
 * whose clock jumps backwards still can't stamp below its own earlier writes.
 */

/** Lowest clock: stamps data converted from v1 so any real edit beats it. */
export const ZERO = "0";

export interface ClockState {
  node: string;
  l: number; // logical ms
  c: number; // counter within l
}

const L_WIDTH = 10;
const C_WIDTH = 5;

let state: ClockState | null = null;
let now = () => Date.now();

export function encode(l: number, c: number, node: string): string {
  return `${l.toString(36).padStart(L_WIDTH, "0")}-${c
    .toString(36)
    .padStart(C_WIDTH, "0")}-${node}`;
}

export function decode(t: string): { l: number; c: number } | null {
  const m = /^([0-9a-z]+)-([0-9a-z]+)-/.exec(t);
  if (!m) return null;
  return { l: parseInt(m[1], 36), c: parseInt(m[2], 36) };
}

/** Starts the clock from persisted state, or a fresh node id. */
export function initClock(saved?: ClockState | null): ClockState {
  const node =
    saved?.node || crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  state = { node, l: saved?.l ?? 0, c: saved?.c ?? 0 };
  return state;
}

const clock = () => state ?? initClock();

/** Snapshot to persist (see tracker.save). */
export const clockState = (): ClockState => ({ ...clock() });

/** A timestamp for a local write, strictly greater than any seen so far. */
export function tick(): string {
  const s = clock();
  const pt = now();
  if (pt > s.l) {
    s.l = pt;
    s.c = 0;
  } else {
    s.c += 1;
  }
  return encode(s.l, s.c, s.node);
}

/** Folds a remote timestamp into the clock (receive event). */
export function observe(t: string): void {
  const remote = decode(t);
  if (!remote) return; // ZERO or foreign format: nothing to learn
  const s = clock();
  const pt = now();
  const l = Math.max(s.l, remote.l, pt);
  if (l === s.l && l === remote.l) s.c = Math.max(s.c, remote.c) + 1;
  else if (l === s.l) s.c += 1;
  else if (l === remote.l) s.c = remote.c + 1;
  else s.c = 0;
  s.l = l;
}

/** Test hook. */
export function _setNow(fn: () => number) {
  now = fn;
}
