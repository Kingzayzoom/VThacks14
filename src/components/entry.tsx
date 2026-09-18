"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { MotionControl } from "./motion-system";
import { SignalField } from "./atmosphere";
import { Brand, ModeBadge, AgentGlyph } from "./ui";
import { MissionComposer } from "./composer";
import { AgentSignature } from "./agent-signature";

export function Entry() {
  return (
    <div className="entry">
      <SignalField />
      <header className="entry-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#principles">The system</a>
          <Link href="/field">Operations</Link>
        </nav>
        <div>
          <MotionControl />
          <ModeBadge />
          <Link className="button subtle" href="/field">
            Enter workspace
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main id="main" className="entry-main">
        <aside className="edge-note left">
          <span className="eyebrow">
            INDEPENDENT AGENTS.
            <br />
            SHARED DIRECTION.
          </span>
          <span className="annotation-line" />
          <span className="eyebrow muted">
            FIELD NOTES / 001
            <br />
            VTHACKS 14
          </span>
          <div className="specimen-plate" aria-hidden="true">
            <AgentSignature id="coordinator" />
            <span className="eyebrow">FIG. 01 — CONVERGENCE</span>
          </div>
          <p className="plate-description">
            Many independent minds.
            <br />
            One shared direction.
          </p>
        </aside>
        <aside className="edge-note right">
          <span className="eyebrow">
            OBSERVE.
            <br />
            COORDINATE.
            <br />
            ADVANCE.
          </span>
          <span className="annotation-line" />
          <p className="margin-statement">
            Closer
            <br />
            to <em>intent.</em>
          </p>
          <span className="eyebrow margin-footnote">
            AN INSTRUMENT FOR
            <br />
            COORDINATED INTELLIGENCE.
          </span>
        </aside>
        <div className="hero-heading">
          <div className="eyebrow edition">
            <span className="tiny-rule" /> AUTONOMOUS SYSTEMS. HUMAN AUTHORITY.{" "}
            <span className="tiny-rule" />
          </div>
          <p className="hero-wordmark">PERIHELION</p>
          <p className="eyebrow system-title">
            <span>AGENTIC OPERATIONS SYSTEM</span>
            <span className="system-edition">VOL. 01 / FIELD INSTRUMENT</span>
          </p>
          <div className="hero-divider">
            <span>+</span>
          </div>
          <h1>
            Intelligence, <em>coordinated.</em>
          </h1>
          <p className="hero-description">
            Give one objective. Coordinate the right agents. Stay in control.
          </p>
        </div>
        <MissionComposer />
        <div className="entry-instrument-rule" aria-hidden="true">
          <span>INTENT</span>
          <i />
          <span>COORDINATION</span>
          <i />
          <span>HUMAN AUTHORITY</span>
        </div>
        <section
          className="entry-field-preview"
          aria-label="Demo agent field preview"
        >
          <div className="preview-caption">
            <span className="eyebrow">01 / THE COORDINATION FIELD</span>
            <span className="eyebrow muted">ILLUSTRATIVE TOPOLOGY · DEMO</span>
          </div>
          <svg
            className="preview-lines"
            viewBox="0 0 900 150"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M130 70 C250 70 270 130 450 65 S700 25 780 70" />
            <path d="M130 70 C300 170 630 145 780 70" />
            <path d="M450 65V135" />
            {Array.from({ length: 9 }, (_, i) => (
              <ellipse
                key={i}
                cx="450"
                cy="115"
                rx={110 + i * 28}
                ry={6 + i * 4}
              />
            ))}
          </svg>
          <div className="preview-agent scout">
            <AgentGlyph id="scout" />
            <span>DISCOVER</span>
          </div>
          <div className="preview-agent coordinator">
            <AgentSignature id="coordinator" />
            <span>COORDINATE</span>
          </div>
          <div className="preview-agent forge">
            <AgentGlyph id="forge" />
            <span>CREATE</span>
          </div>
        </section>
        <section id="principles" className="principles">
          <article>
            <span className="eyebrow">01 / COORDINATION</span>
            <h2>One objective. Many minds.</h2>
            <p>Specialized agents, a shared plan, and work you can follow.</p>
          </article>
          <article>
            <span className="eyebrow">02 / IDENTITY</span>
            <h2>Know who’s in the field.</h2>
            <p>Inspect identity and capabilities before granting access.</p>
          </article>
          <article>
            <span className="eyebrow">03 / HUMAN AUTHORITY</span>
            <h2>Autonomy, with a boundary.</h2>
            <p>See what needs your decision. Keep permission in your hands.</p>
          </article>
        </section>
      </main>
      <footer className="entry-footer">
        <span className="eyebrow">PERIHELION / FRONTEND PREVIEW</span>
        <Link href="/field">
          Explore the demo field
          <ArrowRight size={14} />
        </Link>
        <span className="eyebrow muted">BUILT FOR INTENT.</span>
      </footer>
    </div>
  );
}
