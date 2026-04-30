import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const isProduction = process.env.NODE_ENV === "production";
const isReplit = !!process.env.REPL_ID;

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

const basePath = process.env.BASE_PATH ?? "/";

// SPA fallback plugin for Vite 7 (server.historyApiFallback does not exist in v7)
// Must be a PRE-hook (no return) so the rewrite happens before static file resolution.
// Also covers vite preview (production/Render) via configurePreviewServer.
function spaMiddleware(req: any, _res: any, next: () => void) {
  const url: string = req.url ?? "/";
  const accept: string = req.headers?.accept ?? "";
  if (
    req.method === "GET" &&
    accept.includes("text/html") &&
    !url.startsWith("/api") &&
    !url.startsWith("/@") &&
    !url.startsWith("/__") &&
    !url.includes(".")
  ) {
    req.url = "/";
  }
  next();
}

const spaFallback = {
  name: "spa-fallback",
  configureServer(server: any) {
    server.middlewares.use(spaMiddleware);
  },
  configurePreviewServer(server: any) {
    server.middlewares.use(spaMiddleware);
  },
};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    spaFallback,
    // After build: copy index.html → 404.html so Render static hosting serves
    // the SPA shell for unknown paths (works even without rewrite rules).
    {
      name: "spa-404-fallback",
      closeBundle() {
        const dist = path.resolve(import.meta.dirname, "dist/public");
        const src = path.join(dist, "index.html");
        const dst = path.join(dist, "404.html");
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
      },
    },
    ...(!isProduction && isReplit
      ? [
          (await import("@replit/vite-plugin-runtime-error-modal")).default(),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
