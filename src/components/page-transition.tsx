"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useFieldMotion } from "./motion-system";

function destination(path: string) {
  if (path === "/") return "New objective";
  if (path === "/field") return "Overview";
  if (path === "/agents") return "Agents";
  if (path === "/settings") return "Settings";
  return path === "/missions" ? "Missions" : "Mission detail";
}

/** A route presentation, not a progress meter. Navigation itself is never delayed. */
export function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { still } = useFieldMotion();
  const curtain = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const previous = useRef(path);
  const active = useRef(false);
  const origin = useRef<HTMLElement | null>(null);
  const started = useRef(0);
  const committed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const escapeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const finish = useCallback(() => {
    clearTimeout(timer.current);
    clearTimeout(escapeTimer.current);
    if (curtain.current) curtain.current.hidden = true;
    if (content.current) {
      content.current.inert = false;
      content.current.removeAttribute("aria-busy");
    }
    if (active.current && committed.current) {
      const heading = content.current?.querySelector<HTMLElement>("main h1") ?? content.current?.querySelector<HTMLElement>("main");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
    if (active.current && !committed.current && origin.current?.isConnected) origin.current.focus({ preventScroll: true });
    active.current = false;
  }, []);

  const begin = useCallback((target: string) => {
    clearTimeout(timer.current);
    clearTimeout(escapeTimer.current);
    if (!active.current) origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    active.current = true;
    committed.current = false;
    started.current = performance.now();
    if (label.current) label.current.textContent = `Opening ${destination(target)}`;
    if (curtain.current) {
      curtain.current.dataset.phase = "cover";
      curtain.current.hidden = false;
    }
    if (content.current) { content.current.inert = true; content.current.setAttribute("aria-busy", "true"); }
    // Failed/cancelled navigation must never trap the workspace behind a curtain.
    escapeTimer.current = setTimeout(finish, 8000);
  }, [finish]);

  useEffect(() => {
    function click(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href, location.href);
      if (target.origin !== location.origin || target.pathname === location.pathname) return;
      begin(target.pathname);
    }
    function escape(event: KeyboardEvent) { if (event.key === "Escape" && active.current) finish(); }
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", escape);
    };
  }, [begin, finish]);

  useLayoutEffect(() => {
    if (path === previous.current) return;
    previous.current = path;
    // Covers router.push and browser history as well as links; never initial load.
    if (!active.current) begin(path);
    committed.current = true;
    if (label.current) label.current.textContent = destination(path);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (curtain.current) curtain.current.dataset.phase = "reveal";
      timer.current = setTimeout(finish, still ? 0 : 280);
    }, still ? 0 : Math.max(0, 320 - (performance.now() - started.current)));
  }, [path, still, begin, finish]);

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(escapeTimer.current); }, []);

  return <>
    <div ref={content} className="page-content">{children}</div>
    <div ref={curtain} className="page-transition" data-phase="cover" hidden>
      <div className="page-transition-identity" aria-hidden="true">
        <svg viewBox="0 0 28 28" fill="none"><path d="M22 5H11L4 12v11h11l7-7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M11 5v11h11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M19 2h6v6h-6z" fill="#b8c8ef" /></svg>
        <span>CORTEXAI</span>
      </div>
      <div className="page-transition-center">
        <span ref={label} role="status" aria-live="polite" aria-atomic="true" className="page-transition-label" />
        <span className="page-transition-line" aria-hidden="true"><i /></span>
      </div>
      <span className="page-transition-edge" aria-hidden="true" />
    </div>
  </>;
}
