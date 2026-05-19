import type { NextConfig } from "next";
import path from "node:path";

const shimEdgeConfig = !process.env.EDGE_CONFIG;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // When EDGE_CONFIG isn't set (local dev without the Vercel integration),
  // route @vercel/edge-config to a local shim that returns undefined for
  // every read. lib/permissions.ts gracefully degrades to admin-only.
  ...(shimEdgeConfig
    ? {
        turbopack: {
          resolveAlias: {
            // Turbopack expects relative paths (project-root-relative).
            "@vercel/edge-config": "./lib/_edge-config-shim.ts",
          },
        },
        webpack: (config: { resolve: { alias: Record<string, string> } }) => {
          config.resolve.alias["@vercel/edge-config"] = path.resolve(
            __dirname,
            "./lib/_edge-config-shim.ts",
          );
          return config;
        },
      }
    : {}),
};

export default nextConfig;
