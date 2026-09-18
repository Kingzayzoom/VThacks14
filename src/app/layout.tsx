import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@/styles/utilities.css";
import "@/styles/tokens.css";
import "@/styles/global.css";
import "@/styles/refinement.css";
import "@/styles/living.css";
import { MotionSystem } from "@/components/motion-system";
import { ControlProvider } from "@/components/provider";
import { runtimeConfig } from "@/lib/env/config";
export const metadata: Metadata = {
  title: "PERIHELION — Intelligence, coordinated.",
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
          <MotionSystem><ControlProvider>{children}</ControlProvider></MotionSystem>
        ) : (
          <main id="main" className="setup-error">
            <h1>Live runtime is not configured.</h1>
            <p>
              This Phase A checkpoint supports demo mode. Set
              PERIHELION_RUNTIME_MODE to demo or leave it empty.
            </p>
            <code>{config.error}</code>
          </main>
        )}
      </body>
    </html>
  );
}
