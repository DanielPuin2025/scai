// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Valores públicos de respaldo (no secretos): garantizan que cualquier build
// incluya la conexión aunque el entorno no defina las variables.
const PUBLIC_SUPABASE = {
  VITE_SUPABASE_URL: "https://qfzkielofjtixolcbhub.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TuAn-5Q7SIEmTydbuoc1Sg_tfhDBctB",
  VITE_SUPABASE_PROJECT_ID: "qfzkielofjtixolcbhub",
};
for (const [k, v] of Object.entries(PUBLIC_SUPABASE)) {
  if (!process.env[k]) process.env[k] = v;
  const serverKey = k.replace("VITE_", "");
  if (!process.env[serverKey]) process.env[serverKey] = process.env[k];
}

export default defineConfig({
  // Fuera de Lovable: `npm run build:node` define NITRO_PRESET=node-server para
  // generar un servidor Node.js independiente (.output/server/index.mjs).
  // Sin la variable se conserva el destino por defecto.
  nitro: process.env.NITRO_PRESET ? { preset: process.env.NITRO_PRESET } : undefined,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,ico,png,svg,webmanifest}"],
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/_serverFn\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "scai-html" },
            },
            {
              urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
                sameOrigin && /\/assets\//.test(url.pathname),
              handler: "CacheFirst",
              options: { cacheName: "scai-assets" },
            },
          ],
        },
      }),
    ],
  },
});
