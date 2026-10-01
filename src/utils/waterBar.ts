/**
 * Geometry for the income/expense bar on Home, where the boundary between
 * income (green, left) and expense (red, right) is a flowing water surface.
 *
 * The surface is a vertical sine edge drawn over a strip taller than the bar
 * by whole wavelengths; sliding the strip up by exactly one wavelength and
 * looping (CSS) shows a seamless, endlessly flowing edge. Only a transform is
 * animated, so nothing is recomputed per frame.
 */

/** Income share of income + expense; null when there is nothing to show. */
export function incomeShare(income: number, expense: number): number | null {
  const i = Math.max(0, income);
  const e = Math.max(0, expense);
  if (i + e === 0) return null;
  return i / (i + e);
}

export interface WaveOptions {
  /** Bar height in px. */
  height: number;
  /** Distance between crests, px. The loop slides the strip by this much. */
  wavelength: number;
  /** Crest offset from the mean edge, px. */
  amplitude: number;
  /** Phase shift as a fraction of a wavelength (to desync layers). */
  phase?: number;
  /** How far the fill reaches left of the edge, px — covers the slant. */
  reach?: number;
}

/** Height of the strip: the bar plus one extra wavelength to slide through. */
export const stripHeight = (o: WaveOptions) =>
  Math.ceil(o.height / o.wavelength + 1) * o.wavelength;

/**
 * SVG path of the water: filled from x = -reach to a sine edge centred on
 * x = 0, from the top of the strip to its bottom. Periodic in `wavelength`,
 * so translating it by one wavelength looks identical.
 */
export function wavePath(o: WaveOptions): string {
  const h = stripHeight(o);
  const reach = o.reach ?? 24;
  const phase = (o.phase ?? 0) * 2 * Math.PI;
  const steps = Math.max(8, Math.round(h)); // ~1px per segment
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = (h * i) / steps;
    const x = o.amplitude * Math.sin((2 * Math.PI * y) / o.wavelength + phase);
    points.push(`${round(x)} ${round(y)}`);
  }
  return `M ${-reach} 0 L ${points.join(" L ")} L ${-reach} ${round(h)} Z`;
}

const round = (n: number) => Math.round(n * 100) / 100;
