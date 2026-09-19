"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Waves } from "lucide-react";

const MotionContext = createContext({ still: false, paused: false, toggle: () => {} });
const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribePreference(onChange: () => void) {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const readPreference = () => window.matchMedia(reducedQuery).matches;
const serverPreference = () => true;
export function MotionSystem({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribePreference, readPreference, serverPreference);
  const still = paused || !!reduced;
  useEffect(() => {
    document.documentElement.dataset.motion = still ? "still" : "fluid";
  }, [still]);
  return (
    <MotionContext.Provider value={{ still, paused, toggle: () => setPaused((value) => !value) }}>
      <MotionConfig reducedMotion={still ? "always" : "user"} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}
export const useFieldMotion = () => useContext(MotionContext);
export function MotionControl() {
  const { still, paused, toggle } = useFieldMotion();
  return (
    <button className="motion-control" onClick={toggle} aria-pressed={paused}
      aria-label={paused ? "Resume visual motion" : "Pause visual motion"}
      title={still ? "Visual motion is still" : "Pause ambient and interface motion"}>
      <Waves size={14} /><span>{still ? "STILL" : "FLUID"}</span>
    </button>
  );
}
