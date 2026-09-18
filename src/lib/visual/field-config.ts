/** Art direction controls. Ambient time never changes mission state. */
export const fieldConfig = {
  speed: 0.22,
  amplitude: 1,
  density: 48,
  glow: 1,
  opacity: 0.94,
  fps: 30,
  pixelRatio: 1.4,
  mobileDensity: 24,
  parallax: 14,
} as const;
export type FieldVariant = "entry" | "workspace" | "network";
