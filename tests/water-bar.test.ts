import { describe, expect, it } from "vitest";
import { incomeShare, stripHeight, wavePath } from "../src/utils/waterBar";

const xs = (path: string) =>
  [...path.matchAll(/L (-?[\d.]+) (-?[\d.]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);

describe("water bar", () => {
  it("income share of the period", () => {
    expect(incomeShare(0, 500)).toBe(0); // only expenses → all red
    expect(incomeShare(500, 0)).toBe(1);
    expect(incomeShare(300, 100)).toBe(0.75);
    expect(incomeShare(0, 0)).toBeNull();
  });

  const wave = { height: 24, wavelength: 12, amplitude: 2.5 };

  it("strip covers the bar plus one wavelength to slide through", () => {
    const h = stripHeight(wave);
    expect(h).toBeGreaterThanOrEqual(wave.height + wave.wavelength);
    expect(h % wave.wavelength).toBe(0); // whole wavelengths: the loop is seamless
  });

  it("is periodic: shifting by one wavelength gives the same edge", () => {
    const edge = xs(wavePath(wave)).filter(([, y]) => y <= stripHeight(wave));
    const at = (y: number) =>
      edge.find(([, yy]) => Math.abs(yy - y) < 0.01)?.[0];
    for (const y of [1, 3, 5, 7, 10]) {
      expect(at(y + wave.wavelength)).toBeCloseTo(at(y)!, 1);
    }
  });

  it("stays within its amplitude and phase-shifts the back layer", () => {
    for (const [x] of xs(wavePath(wave)).slice(1, -1)) {
      expect(Math.abs(x)).toBeLessThanOrEqual(wave.amplitude + 1e-9);
    }
    expect(wavePath({ ...wave, phase: 0.5 })).not.toBe(wavePath(wave));
  });
});
