import { spawn } from "node:child_process";
// The supervised preview passes Vite-style flags. Serve the built Next export
// for production QA; ordinary npm run dev keeps Next hot reloading.
const args = process.argv.slice(2);
const supervised = args.includes("--strictPort");
const child = spawn(
  process.execPath,
  supervised
    ? ["scripts/serve.mjs", ...args]
    : [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "0.0.0.0",
        "--port",
        "4173",
        ...args,
      ],
  { stdio: "inherit" },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
