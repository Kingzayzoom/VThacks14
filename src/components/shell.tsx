"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Aperture,
  Layers2,
  Network,
  MicOff,
  Settings2,
  Plus,
  ArrowUpRight,
  Menu,
  X,

} from "lucide-react";
import { Brand, ModeBadge } from "./ui";
import { Dialog } from "./dialog";
import { MissionComposer } from "./composer";
import { VoicePanel } from "./voice/voice-panel";

const nav = [
  {
    name: "Overview",
    index: "01",
    icon: Aperture,
    href: "/field",
    description: "Agent operations",
  },
  {
    name: "Missions",
    index: "02",
    icon: Layers2,
    href: "/missions",
    description: "Objectives and tasks",
  },
  {
    name: "Agents",
    index: "03",
    icon: Network,
    href: "/agents",
    description: "Workforce directory",
  },
];
export function Shell({ children }: { children: React.ReactNode }) {

  const path = usePathname();
  const [newMission, setNewMission] = useState(false);
  const [composerGeneration, setComposerGeneration] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [voice, setVoice] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState("");
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileNav) return;
    const previous = document.activeElement as HTMLElement | null;
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, [mobileNav]);
  function trapNavigation(e: React.KeyboardEvent) {
    if (!mobileNav) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setMobileNav(false);
      return;
    }
    if (e.key !== "Tab") return;
    const targets =
      sidebar.current?.querySelectorAll<HTMLElement>("a[href], button");
    if (!targets?.length) return;
    const first = targets[0],
      last = targets[targets.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  return (
    <div className={`workspace-shell ${path === "/agents" ? "agents-workspace" : ""}`}>
      <aside
        ref={sidebar}
        role={mobileNav ? "dialog" : undefined}
        aria-modal={mobileNav || undefined}
        aria-label={mobileNav ? "Workspace navigation" : undefined}
        onKeyDown={trapNavigation}
        className={`sidebar ${mobileNav ? "mobile-open" : ""}`}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-body">
          <nav aria-label="Workspace navigation">
            {nav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-item ${path.startsWith(item.href) ? "active" : ""}`}
                  onClick={() => setMobileNav(false)}
                  title={item.description}
                  aria-current={path.startsWith(item.href) ? "page" : undefined}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </Link>
              )
            )}
          </nav>
          <div className="sidebar-bottom">
            <Link
              href="/settings"
              className={`nav-item ${path === "/settings" ? "active" : ""}`}
              onClick={() => setMobileNav(false)}
            >
              <Settings2 size={17} />
              <span>Settings</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </aside>
      <div className="workspace-body" inert={mobileNav}>
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="muted">/</span>
            <span>{path === "/field" ? "Overview" : path.startsWith("/missions") ? "Missions" : path === "/agents" ? "Agents" : "Settings"}</span>
          </div>
          <div className="topbar-right">
            <button className="icon-button" onClick={() => setVoice(true)} aria-label="Voice connection information"><MicOff size={18} /></button>
            <button className="button primary" onClick={() => setNewMission(true)}><Plus size={15} />New mission</button>
            <ModeBadge />
          </div>
        </header>
        <main id="main" className="workspace-main">
          {children}
        </main>
      </div>
      <Dialog
        open={newMission}
        onClose={() => setNewMission(false)}
        title="New mission"
        wide
      >
        <h2>Begin with an objective.</h2>
        <p className="secondary">Describe the outcome and any constraints.</p>
        <MissionComposer key={composerGeneration} compact onSubmitted={() => { setNewMission(false); setComposerGeneration(value => value + 1); }} />
      </Dialog>
      <Dialog
        open={voice}
        onClose={() => setVoice(false)}
        title="Voice channel"
      >
        {voice && <VoicePanel initialDraft={voiceDraft} onDraftChange={setVoiceDraft} onSubmitted={() => setVoice(false)} onText={() => {
            setVoice(false);
            setNewMission(true);
            requestAnimationFrame(() => document.getElementById("dialog-objective")?.focus());
          }} />}
      </Dialog>
    </div>
  );
}
