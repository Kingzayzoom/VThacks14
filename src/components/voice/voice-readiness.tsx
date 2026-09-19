"use client";
import { useEffect, useState } from "react";

export function VoiceReadiness() {
  const [label, setLabel] = useState("Checking configuration");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/voice/session", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setLabel(data.configured === true ? "Configured · call not tested" : "Not configured");
      }).catch(() => { if (!controller.signal.aborted) setLabel("Could not check"); });
    return () => controller.abort();
  }, []);
  return <span className="status">{label}</span>;
}
