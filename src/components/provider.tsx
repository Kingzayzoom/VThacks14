"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MockControlApi, STORAGE_KEY } from "@/lib/api/MockControlApi";
import { HttpControlApi } from "@/lib/api/HttpControlApi";
import type { ControlApi } from "@/lib/api/ControlApi";
const ApiContext = createContext<ControlApi | null>(null);
export function ControlProvider({ children, mode = "demo" }: { children: ReactNode; mode?: "demo" | "live" }) {
  const [api] = useState(() => mode === "live" ? new HttpControlApi() : new MockControlApi());
  useEffect(() => {
    if (api instanceof HttpControlApi) return api.start();
    try {
      api.hydrate(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* Storage may be disabled; memory mode still works. */
    }
    return api.subscribe(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(api.getSnapshot()));
      } catch {
        /* Storage is optional. */
      }
    });
  }, [api]);
  useEffect(() => {
    const visibility = () => {
      document.documentElement.dataset.hidden = String(document.hidden);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
export function useControl() {
  const api = useContext(ApiContext);
  if (!api) throw new Error("ControlProvider is required");
  const state = useSyncExternalStore(
    api.subscribe,
    api.getSnapshot,
    api.getServerSnapshot,
  );
  return { api, state };
}
