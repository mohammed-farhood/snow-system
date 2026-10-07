import type { NextConfig } from "next";

// In production nginx sends /api to the API server. In development Next forwards it.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [{ source: "/api/:path*", destination: `${process.env.API_ORIGIN ?? "http://127.0.0.1:3001"}/api/:path*` }];
  },
};

export default nextConfig;
