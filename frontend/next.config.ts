import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds to accommodate in-progress frontend components
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;
