/**
 * Converts OkLCH color values to RGB.
 * OkLCH is a perceptually uniform color space.
 * L: Lightness (0-1)
 * C: Chroma (0-0.4)
 * h: Hue (0-360 in degrees or 0-2pi in radians)
 */
export function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  // Constants for transformation
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_ = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b_))
  ];
}

/**
 * Returns a perceptually uniform rainbow color for a given normalized time t (0-1).
 */
export function getProRainColor(t: number): [number, number, number] {
  // Use a constant perceived lightness (0.75) and chroma (0.12)
  // Hue rotates from 0 to 2*PI
  return oklchToRgb(0.75, 0.12, t * Math.PI * 2);
}
