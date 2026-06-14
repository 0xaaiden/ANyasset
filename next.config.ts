import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['b4a5-2601-8c-4301-faf0-b588-4924-baff-d2ef.ngrok-free.app'],
  turbopack: {
    root: path.resolve()
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }
    ]
  }
};

export default nextConfig;
