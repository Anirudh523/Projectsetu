import { build } from "esbuild";
await build({
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  external: ["firebase-admin", "firebase-admin/*", "firebase-functions", "firebase-functions/*"],
});
