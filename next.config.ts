import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The monthly PDF reads its Space Grotesk font files from disk at runtime; ship them with that route.
  outputFileTracingIncludes: {
    "/kas/*/report": ["./src/assets/fonts/**"],
  },
};

export default nextConfig;
