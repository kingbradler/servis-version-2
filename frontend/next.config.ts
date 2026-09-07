import type { NextConfig } from "next";
import path from "path";

type ImageRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
};

function mediaPatternFromApiUrl(): ImageRemotePattern[] {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  try {
    const url = new URL(raw);
    const protocol = url.protocol === "https:" ? "https" : "http";
    const pattern: ImageRemotePattern = {
      protocol,
      hostname: url.hostname,
      pathname: "/media/**",
    };
    if (url.port) {
      pattern.port = url.port;
    }
    return [pattern];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    // Pin root to frontend/ to avoid picking up a parent package-lock.json
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/photos/**",
      },
      {
        protocol: "https",
        hostname: "api.servis-superrapid.com",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "18001",
        pathname: "/media/**",
      },
      ...mediaPatternFromApiUrl(),
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
