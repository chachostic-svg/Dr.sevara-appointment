import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const repoRoot = path.resolve(__dirname, "..");

const nextConfig = {
  devIndicators: false,
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/*": ["../data/**/*", "../shared/**/*", "../bot/**/*"],
  },
  serverExternalPackages: ["@neondatabase/serverless", "grammy"],
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
    "*.trycloudflare.com",
    "*.vercel.app",
    "web.telegram.org",
    "*.telegram.org",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: repoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
