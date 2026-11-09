import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

await build({
  entryPoints: ["src/index.ts"],
  outfile: "hearthpane.js",
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "iife",
  target: ["chrome67"],
  legalComments: "none",
  define: { __HEARTHPANE_VERSION__: JSON.stringify(packageJson.version) },
  banner: { js: `/*! HearthPane v${packageJson.version} | MIT License | https://github.com/twangen/hearthpane */` }
});

const bundle = await readFile("hearthpane.js", "utf8");
await writeFile("hearthpane.js", `${bundle.trim()}\n`, "utf8");
