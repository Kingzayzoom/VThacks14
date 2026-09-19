"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ArrowRight,
} from "lucide-react";
import { Brand, ModeBadge } from "./ui";
import { useControl } from "./provider";
import { Dialog } from "./dialog";
import { MissionComposer } from "./composer";
import { MotionControl } from "./motion-system";
import { SignalField } from "./atmosphere";

const nav = [
  {
    name: "FIELD",
    index: "01",
    icon: Aperture,
    href: "/field",
    description: "Agent operations",
  },
  {
    name: "MISSIONS",
    index: "02",
    icon: Layers2,
    href: "/missions",
    description: "Objectives and tasks",
  },
  {
    name: "AGENTS",
    index: "03",
    icon: Network,
    href: "/agents",
    description: "Workforce directory",
  },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const { api, state } = useControl();
  const path = usePathname();
  const router = useRouter();
  const [newMission, setNewMission] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [voice, setVoice] = useState(false);
  const [command, setCommand] = useState("");
  const [commandError, setCommandError] = useState("");
  const mission =
    state.missions.find((m) => m.id === state.selectedMissionId) ??
    state.missions[0];
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
  async function submitCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim()) {
      setCommandError("Type an objective to create a demo mission.");
      return;
    }
    const objective = command;
    setCommand("");
    setCommandError("");
    try {
      const created = await api.createMission({
        objective,
        idempotencyKey: crypto.randomUUID(),
      });
      router.push(`/missions/${created.id}`);
    } catch (err) {
      setCommand(objective);
      setCommandError(
        err instanceof Error ? err.message : "Unable to create mission.",
      );
    }
  }
  return (
    <div className={`workspace-shell ${path === "/agents" ? "agents-workspace" : ""}`}>
      <SignalField compact />
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
                  <span className="nav-index">{item.index}</span>
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
              <span>SETTINGS</span>
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
            <span className="eyebrow">WORKSPACE</span>
            <span className="muted">/</span>
            <span>Personal field</span>
          </div>
          <div className="topbar-right">
            <MotionControl />
            <ModeBadge />
          </div>
        </header>
        <div className="mission-context">
          <div>
            <span className="eyebrow muted">ACTIVE MISSION</span>
            <label className="sr-only" htmlFor="active-mission">
              Active mission
            </label>
            <select
              id="active-mission"
              value={mission.id}
              onChange={(e) => {
                api.selectMission(e.target.value);
                if (path.startsWith("/missions/"))
                  router.push(`/missions/${e.target.value}`);
              }}
            >
              {state.missions.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <button className="button subtle" onClick={() => setNewMission(true)}>
            <Plus size={15} />
            New mission
          </button>
        </div>
        <main id="main" className="workspace-main">
          {children}
        </main>
        <div className="command-dock">
          <button
            className="voice-control"
            onClick={() => setVoice(true)}
            aria-label="Voice connection information"
          >
            <MicOff size={19} />
          </button>
          <form onSubmit={submitCommand}>
            <label className="sr-only" htmlFor="dock-command">
              New mission objective
            </label>
            <input
              id="dock-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Give the field a new objective…"
              maxLength={2000}
            />
            <button
              className="icon-button"
              type="submit"
              aria-label="Run new objective"
            >
              <ArrowRight size={19} />
            </button>
          </form>
          {commandError && (
            <p className="dock-error" role="alert">
              {commandError}
            </p>
          )}
        </div>
      </div>
      <Dialog
        open={newMission}
        onClose={() => setNewMission(false)}
        title="New mission"
        wide
      >
        <h2>Begin with an objective.</h2>
        <p className="secondary">Tell the field what you want to accomplish.</p>
        <MissionComposer compact onSubmitted={() => setNewMission(false)} />
      </Dialog>
      <Dialog
        open={voice}
        onClose={() => setVoice(false)}
        title="Voice channel"
      >
        <MicOff className="dialog-symbol" size={32} />
        <h2>A voice, when you’re ready.</h2>
        <p>
          ElevenLabs is not connected in this frontend checkpoint. Use the text
          command channel to create a demo mission.
        </p>
        <div className="notice">Microphone inactive. No audio is captured.</div>
        <button
          className="button primary"
          onClick={(e) => {
            e.currentTarget.closest("dialog")?.close();
            setVoice(false);
            document.getElementById("dock-command")?.focus();
          }}
        >
          Use text instead
          <ArrowRight size={16} />
        </button>
      </Dialog>
    </div>
  );
}
