"use client";

import { useEffect, useRef } from "react";
import { subscribeFrame } from "@/lib/visual/frame-clock";
import { useFieldMotion } from "../motion-system";
import { fieldNodes } from "./field-model";

type Point = { x: number; y: number };
function bezier(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const s = 1 - t;
  return { x: s ** 3 * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t ** 3 * d.x,
    y: s ** 3 * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t ** 3 * d.y };
}

/** Decorative optical material. Never drives tasks, transfers, or agent state. */
export function FieldAtmosphere({ selected }: { selected: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedRef = useRef(selected);
  const timeRef = useRef(0);
  const { still } = useFieldMotion();
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context = ctx;
    let width = 1, height = 1, ratio = 1, visible = false;
    let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
    let unsubscribe: (() => void) | undefined;
    const branches = fieldNodes.filter((node) => node.id !== "coordinator" && node.id !== "guardian");

    function draw(time: number) {
      timeRef.current = time;
      const t = time * 0.14;
      pointerX += ((still ? 0 : targetX) - pointerX) * 0.045;
      pointerY += ((still ? 0 : targetY) - pointerY) * 0.045;
      context.setTransform(ratio * width / 1000, 0, 0, ratio * height / 660, 0, 0);
      context.clearRect(0, 0, 1000, 660);
      const center = { x: 560, y: 277.2 };
      const strands = width < 650 ? 16 : 33;
      context.globalCompositeOperation = "screen";
      // Fine silk surfaces converge on the actual node positions.
      branches.forEach((node, branch) => {
        const dest = { x: node.x * 10, y: node.y * 6.6 };
        const side = dest.x < center.x ? -1 : 1;
        const endpoint = { x: branch === 3 ? 530 : side < 0 ? -100 : 1100,
          y: branch === 3 ? 780 : dest.y + (dest.y - center.y) * 1.3 };
        const active = selectedRef.current === node.id || selectedRef.current === "coordinator";
        const haze = context.createRadialGradient(dest.x, dest.y, 3, dest.x, dest.y, 200);
        haze.addColorStop(0, `${node.color}${active ? "16" : "0b"}`);
        haze.addColorStop(0.35, `${node.color}06`);
        haze.addColorStop(1, `${node.color}00`);
        context.fillStyle = haze;
        context.fillRect(dest.x - 200, dest.y - 200, 400, 400);
        for (let strand = 0; strand < strands; strand++) {
          const evenlySpaced = strand / (strands - 1) - 0.5;
          const spread = evenlySpaced + Math.sin(strand * 0.65 + branch) * 0.045;
          const breath = Math.sin(t + branch * 1.7 + strand * 0.13);
          const anchor = { x: center.x + spread * 35, y: center.y + spread * 22 };
          const knot = { x: dest.x + spread * 42 + Math.sin(spread * 8 + t * 0.6) * 5, y: dest.y + spread * 50 };
          const c1 = { x: center.x + (dest.x - center.x) * 0.12 + pointerX,
            y: dest.y + spread * 140 + breath * 14 + pointerY };
          const c2 = { x: dest.x + (center.x - dest.x) * 0.2 + breath * 13,
            y: center.y + spread * 110 };
          const c3 = { x: dest.x - side * 55 + spread * 135, y: dest.y + spread * 180 - breath * 35 + (branch % 2 ? -80 : 100) };
          const c4 = { x: endpoint.x - side * 120, y: endpoint.y + spread * 380 + breath * 65 + (branch % 2 ? 165 : -160) };
          context.beginPath();
          context.moveTo(anchor.x, anchor.y);
          context.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, knot.x, knot.y);
          context.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, endpoint.x, endpoint.y + spread * 170);
          context.strokeStyle = node.color;
          context.lineWidth = strand % 8 === 0 ? 0.85 : 0.42;
          context.globalAlpha = (active ? 0.27 : 0.14) * (0.7 + 0.3 * Math.sin(strand * 2 + t));
          context.stroke();
          if (strand === Math.floor(strands * 0.45)) {
            context.globalAlpha = active ? 0.045 : 0.022;
            context.lineWidth = 7;
            context.stroke();
            context.globalAlpha = active ? 0.48 : 0.26;
            context.lineWidth = 1;
            context.stroke();
          }
          // Light specks breathe in place on the fabric; execution packets live in SVG.
          if (strand % 3 === 0) {
            for (let bead = 1; bead < 16; bead++) {
              const u = (bead * 0.097 + strand * 0.018) % 1;
              const p = bead % 2 ? bezier(anchor, c1, c2, knot, u) : bezier(knot, c3, c4, endpoint, u);
              context.globalAlpha = 0.17 + Math.max(0, Math.sin(bead * 2 + strand + t * 2)) * 0.5;
              context.fillStyle = node.color;
              context.beginPath();
              context.arc(p.x, p.y, bead % 4 === 0 ? 1.05 : 0.55, 0, Math.PI * 2);
              context.fill();
            }
          }
        }
      });
      // Wide, faint contour sheets supply the larger composition and depth.
      for (let layer = 0; layer < 30; layer++) {
        context.beginPath();
        for (let step = 0; step <= 80; step++) {
          const x = step / 80 * 1200 - 100;
          const y = 475 + Math.sin(x * 0.005 + t * 0.15 + layer * 0.022) * 148
            + Math.sin(x * 0.011 - t * 0.2) * 35 + layer * 4;
          if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.strokeStyle = layer % 3 ? "#93a6ac" : "#d9c197";
        context.globalAlpha = 0.045;
        context.lineWidth = 0.45;
        context.stroke();
      }
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      canvas!.dataset.rendered = "true";
    }
    function sync() {
      unsubscribe?.();
      unsubscribe = undefined;
      if (!still && visible && !document.hidden) unsubscribe = subscribeFrame(draw);
      canvas!.dataset.motion = still ? "still" : visible && !document.hidden ? "fluid" : "suspended";
    }
    const resize = new ResizeObserver(([entry]) => {
      width = Math.max(1, entry.contentRect.width);
      height = Math.max(1, entry.contentRect.height);
      ratio = Math.min(devicePixelRatio || 1, 1.4);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      draw(timeRef.current);
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (canvas.parentElement) canvas.parentElement.dataset.inView = String(visible);
      sync();
    });
    const pointer = (event: PointerEvent) => {
      if (still || event.pointerType !== "mouse") return;
      const bounds = canvas.getBoundingClientRect();
      targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
      targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 9;
    };
    resize.observe(canvas);
    observer.observe(canvas);
    const host = canvas.parentElement;
    host?.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("visibilitychange", sync);
    return () => {
      unsubscribe?.(); resize.disconnect(); observer.disconnect();
      host?.removeEventListener("pointermove", pointer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [still]);
  return <canvas className="constellation-atmosphere" ref={canvasRef} aria-hidden="true" />;
}
