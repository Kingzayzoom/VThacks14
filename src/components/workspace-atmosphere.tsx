"use client";

import { useSyncExternalStore } from "react";
import { useFieldMotion } from "./motion-system";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const readHidden = () => document.hidden;
const serverHidden = () => true;

/** One non-interactive light field. CSS owns motion; no frame loop or GPU canvas. */
export function WorkspaceAtmosphere() {
  const hidden = useSyncExternalStore(subscribeVisibility, readHidden, serverHidden);
  const { still } = useFieldMotion();
  return <div className="workspace-atmosphere" aria-hidden="true" data-paused={hidden || still} />;
}
