import type { Metadata } from "next";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@/styles/utilities.css";
import "@/styles/tokens.css";
import "@/styles/global.css";
import { MotionSystem } from "@/components/motion-system";
import { ControlProvider } from "@/components/provider";
import { runtimeConfig } from "@/lib/env/config";
import { PageTransition } from "@/components/page-transition";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "CORTEXAI — Intelligence, coordinated.",
  description:
    "Autonomous systems. Human authority. An agentic operations design foundation.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const config = runtimeConfig(process.env);
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {config.available ? (
          <MotionSystem><ControlProvider mode={config.mode}><PageTransition>{children}</PageTransition></ControlProvider></MotionSystem>
        ) : (
          <main id="main" className="setup-error">
            <h1>Live runtime is not configured.</h1>
            <p>
              Set CORTEX_RUNTIME_MODE to demo or live.
            </p>
            <code>{config.error}</code>
          </main>
        )}
      </body>
    </html>
  );
}
