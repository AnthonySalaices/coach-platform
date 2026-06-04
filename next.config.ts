import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server (server.js + traced node_modules) so the
  // Docker image stays small and the normie deploy is a single container.
  output: "standalone",
  // These are server-only and do native/dynamic things the bundler shouldn't
  // touch — keep them external so they resolve from node_modules at runtime.
  serverExternalPackages: ["postgres", "discord.js"],
  // Reverse-proxied behind Caddy; trust the forwarded host/proto.
  poweredByHeader: false,
};

export default nextConfig;
