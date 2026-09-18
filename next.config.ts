import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // Optional isolated output for visual QA when OneDrive locks an older cache.
  distDir: process.env.PERIHELION_BUILD_DIR || ".next",
};
export default config;
