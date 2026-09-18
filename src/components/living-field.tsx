"use client";
import { useEffect, useRef } from "react";
import { fieldConfig as config, type FieldVariant } from "@/lib/visual/field-config";
import { subscribeFrame } from "@/lib/visual/frame-clock";
import { useFieldMotion } from "./motion-system";

/** Original procedural optical ribbons. No bitmap, texture fetch, or 3D engine. */
export function LivingField({ variant = "entry" }: { variant?: FieldVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const { still } = useFieldMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return; // CSS radial fields and SVG contours remain available.
    const ctx = context;
    let width = 1, height = 1, ratio = 1, visible = false, lastTime = timeRef.current;
    let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
    let unsubscribe: (() => void) | undefined;
    const graph = variant === "network";
    const gold = [211, 172, 105];
    const cyan = [102, 170, 177];
    const color = (rgb: number[], a: number) => `rgba(${rgb.join(",")},${a})`;

    function draw(time: number) {
      lastTime = time;
      timeRef.current = time;
      const t = time * config.speed;
      pointerX += ((still ? 0 : targetX) - pointerX) * 0.06;
      pointerY += ((still ? 0 : targetY) - pointerY) * 0.06;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(pointerX, pointerY);
      const mobile = window.innerWidth < 760;
      const w = width, h = height;
      const density = mobile ? config.mobileDensity : config.density;
      // Low-frequency luminous volumes sit behind the finer optical filaments.
      for (let i = 0; i < 3; i++) {
        const x = w * (i === 0 ? 0.87 : i === 1 ? 0.08 : 0.57) + Math.sin(t * 0.6 + i) * w * 0.055;
        const y = h * (i === 0 ? 0.27 : i === 1 ? 0.6 : 0.85) + Math.cos(t * 0.42 + i) * h * 0.07;
        const radius = Math.max(w * 0.36, h * 0.38);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color(i === 1 ? cyan : gold, (graph ? 0.055 : 0.09) * config.glow));
        gradient.addColorStop(0.45, color(i === 1 ? cyan : gold, 0.022));
        gradient.addColorStop(1, color(gold, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }
      // Projected bundles deform continuously; the strands converge and unfold.
      for (let bundle = 0; bundle < 4; bundle++) {
        const cool = bundle === 1 || bundle === 3;
        const rgb = cool ? cyan : gold;
        const phase = bundle * 1.9;
        function point(u: number, strand: number) {
          const spread = strand / density - 0.5;
          const breathe = Math.sin(t * 0.65 + u * 4 + phase);
          const wave = Math.sin(u * (graph ? 8 : 6.8) + phase + t * 0.42);
          const fold = Math.sin(u * 12 - t * 0.23 + phase);
          const envelope = (0.19 + 0.81 * Math.pow(Math.sin(u * Math.PI * 2 + phase + t * 0.14), 2));
          let x = u * (w + 100) - 50;
          let y = h * ((graph ? 0.49 : 0.46) + wave * (graph ? 0.19 : 0.25) + fold * 0.045);
          y += spread * h * (graph ? 0.37 : 0.32) * envelope * config.amplitude;
          y += breathe * h * 0.036;
          if (bundle === 2) { y -= h * 0.36; x += Math.sin(u * 5 + t * 0.3) * w * 0.06; }
          if (bundle === 3) y += h * 0.29;
          return [x, y];
        }
        const gradient = ctx.createLinearGradient(0, 0, w, h * 0.2);
        const alpha = (graph ? 0.32 : 0.46) * (cool ? 0.65 : 1) * config.opacity;
        gradient.addColorStop(0, color(rgb, alpha * 0.4));
        gradient.addColorStop(0.2, color(rgb, alpha));
        gradient.addColorStop(0.5, color(rgb, alpha * (graph ? 0.6 : 0.13)));
        gradient.addColorStop(0.79, color(rgb, alpha));
        gradient.addColorStop(1, color(rgb, alpha * 0.3));
        ctx.strokeStyle = gradient;
        for (let strand = 0; strand < density; strand++) {
          ctx.beginPath();
          for (let step = 0; step <= 94; step++) {
            const [x, y] = point(step / 94, strand);
            if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineWidth = strand % 11 === 0 ? 1 : 0.48;
          ctx.globalAlpha = 0.57 + Math.sin(strand * 1.5 + t * 0.4) * 0.22;
          ctx.stroke();
        }
        // Optical caustics: a narrow luminous ridge within the folded surface.
        // Broad, low-alpha strokes supply bloom without per-frame blur filters.
        const focus = 0.5 + Math.sin(t * 0.32 + phase) * 0.28;
        const ridge = ctx.createLinearGradient(0, 0, w, 0);
        ridge.addColorStop(0, color(rgb, 0));
        ridge.addColorStop(Math.max(0.01, focus - 0.2), color(rgb, 0.03));
        ridge.addColorStop(focus, color(cool ? [159, 214, 215] : [243, 213, 156], cool ? 0.53 : 0.85));
        ridge.addColorStop(Math.min(0.99, focus + 0.2), color(rgb, 0.03));
        ridge.addColorStop(1, color(rgb, 0));
        ctx.strokeStyle = ridge;
        ctx.beginPath();
        for (let step = 0; step <= 120; step++) {
          const [x, y] = point(step / 120, density * (0.47 + Math.sin(t * 0.19 + phase) * 0.15));
          if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (const [lineWidth, alpha] of [[14, 0.025], [6, 0.065], [2.5, 0.16], [0.85, 0.9]]) {
          ctx.lineWidth = lineWidth;
          ctx.globalAlpha = alpha * config.glow;
          ctx.stroke();
        }
        // Sparse light grains stay attached to the surface, never a starfield.
        for (let grain = 0; grain < (mobile ? 14 : 28); grain++) {
          const u = (grain * 0.0371 + bundle * 0.137 + t * (cool ? 0.011 : 0.007)) % 1;
          const [x, y] = point(u, (grain * 13.71) % density);
          const luminance = 0.22 + 0.22 * Math.sin(grain * 1.2 + t * 0.7);
          ctx.globalAlpha = luminance;
          ctx.fillStyle = color(rgb, 0.8);
          ctx.fillRect(x, y, grain % 9 === 0 ? 1.8 : 0.9, grain % 9 === 0 ? 1.8 : 0.9);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      canvas!.dataset.rendered = "true";
    }
    function sync() {
      unsubscribe?.();
      unsubscribe = undefined;
      if (visible && !document.hidden && !still) unsubscribe = subscribeFrame(draw);
      canvas!.dataset.motion = still ? "still" : visible && !document.hidden ? "fluid" : "suspended";
    }
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      ratio = Math.min(window.devicePixelRatio || 1, config.pixelRatio);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      draw(lastTime);
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(canvas);
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || still) return;
      targetX = (event.clientX / innerWidth - 0.5) * config.parallax;
      targetY = (event.clientY / innerHeight - 0.5) * config.parallax * 0.6;
    };
    const scroll = () => { if (!still) targetY = -Math.min(window.scrollY, 800) * 0.012; };
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", sync);
    return () => {
      unsubscribe?.(); resize.disconnect(); observer.disconnect();
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [variant, still]);
  return <canvas ref={canvasRef} className={`living-field living-${variant} pointer-events-none absolute inset-0 h-full w-full`} aria-hidden="true" />;
}
