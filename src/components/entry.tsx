"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SignalField } from "./atmosphere";
import { Brand } from "./ui";
import { MissionComposer } from "./composer";
import { MotionControl } from "./motion-system";
import "@/styles/entry.css";

export function Entry() {
  return (
    <div className="entry">
      <SignalField />
      <header className="entry-nav">
        <Brand />
        <Link href="/field">Enter workspace <ArrowUpRight size={14} /></Link>
      </header>
      <main className="entry-main" id="main">
        <div className="hero-heading">
          <p className="hero-wordmark">CORTEXAI</p>
          <h1>Intelligence, <em>coordinated.</em></h1>
          <p className="hero-description">Give one objective. Coordinate the right agents. Stay in control.</p>
        </div>
        <MissionComposer />
      </main>
      <footer className="entry-footer">
        <MotionControl />
        <Link href="/agents">Explore agents <ArrowUpRight size={13} /></Link>
      </footer>
    </div>
  );
}
