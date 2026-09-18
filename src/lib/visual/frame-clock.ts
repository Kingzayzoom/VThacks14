import { fieldConfig } from "./field-config";

// One requestAnimationFrame loop for all visible field canvases. No React renders.
const listeners = new Set<(time: number) => void>();
let frame = 0;
let previous = 0;
let elapsed = 0;
function tick(now: number) {
  const delta = now - previous;
  if (delta >= 1000 / fieldConfig.fps) {
    elapsed += Math.min(delta, 70) / 1000;
    previous = now;
    listeners.forEach((draw) => draw(elapsed));
  }
  frame = requestAnimationFrame(tick);
}
export function subscribeFrame(draw: (time: number) => void) {
  listeners.add(draw);
  if (listeners.size === 1) {
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(draw);
    if (!listeners.size) cancelAnimationFrame(frame);
  };
}
