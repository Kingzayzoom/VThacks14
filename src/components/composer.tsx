"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { useControl } from "./provider";
import { EXAMPLE_OBJECTIVE } from "@/lib/demo/fixtures";

const examples = [
  { label: "Prepare a launch brief", value: EXAMPLE_OBJECTIVE },
  {
    label: "Analyze this dataset",
    value:
      "Analyze the provided public sample dataset. Identify patterns and propose a clear data visualization. Do not publish or contact anyone.",
  },
  {
    label: "Plan a research project",
    value:
      "Plan a research project for our student-built product. Outline questions, public sources, and an execution checklist. Do not contact anyone.",
  },
];
export function MissionComposer({
  compact = false,
  onSubmitted,
}: {
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const { api } = useControl();
  const router = useRouter();
  const [objective, setObjective] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const key = useRef<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    if (!objective.trim()) {
      setError("Describe an objective to begin.");
      input.current?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    key.current ??= crypto.randomUUID();
    try {
      const mission = await api.createMission({
        objective,
        idempotencyKey: key.current,
      });
      onSubmitted?.();
      router.push(`/missions/${mission.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create this mission. Try again.",
      );
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className={`composer ${compact ? "compact-composer" : ""}`}
      onSubmit={submit}
    >
      <label
        htmlFor={compact ? "dialog-objective" : "objective"}
        className="eyebrow composer-label"
      >
        <Sparkles size={13} /> ONE OBJECTIVE. A COORDINATED FIELD.
      </label>
      <div className={`composer-input ${error ? "invalid" : ""}`}>
        <Plus className="input-cross" size={22} strokeWidth={1} />
        <textarea
          ref={input}
          id={compact ? "dialog-objective" : "objective"}
          value={objective}
          maxLength={2000}
          rows={2}
          onChange={(e) => {
            setObjective(e.target.value);
            key.current = null;
            setError("");
          }}
          placeholder="What would you like to accomplish?"
          aria-describedby={error ? "composer-error" : "composer-hint"}
          aria-invalid={!!error}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              e.currentTarget.form?.requestSubmit();
          }}
        />
        <button
          type="submit"
          className="button primary run-button"
          disabled={busy}
        >
          {busy ? "Opening…" : "Run objective"}
          <ArrowRight size={18} />
        </button>
      </div>
      {error && (
        <p className="form-error" id="composer-error" role="alert">
          {error}
        </p>
      )}
      <div className="composer-meta" id="composer-hint">
        <span>Demo mission · public sample data · no external actions</span>
        <kbd>Ctrl ↵</kbd>
      </div>
      <div className="examples">
        <span className="try-label">Try an objective</span>
        {examples.map((example) => (
          <button
            type="button"
            key={example.label}
            onClick={() => {
              setObjective(example.value);
              setError("");
              key.current = null;
              input.current?.focus();
            }}
          >
            {example.label}
            <ArrowRight size={12} />
          </button>
        ))}
      </div>
    </form>
  );
}
