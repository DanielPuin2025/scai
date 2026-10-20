// Compila SCAI como servidor Node.js independiente (fuera de Lovable).
// Resultado: .output/server/index.mjs  ->  ejecutar con `npm start`.
import { spawnSync } from "node:child_process";
process.env.NITRO_PRESET = process.env.NITRO_PRESET || "node-server";
const r = spawnSync("npx", ["vite", "build"], { stdio: "inherit", shell: true, env: process.env });
process.exit(r.status ?? 1);
