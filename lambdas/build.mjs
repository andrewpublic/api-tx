import { build } from "esbuild";
import { mkdirSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "dist");
mkdirSync(distDir, { recursive: true });

const lambdas = ["fetch", "enrich", "sheets-sync", "api"];

for (const name of lambdas) {
  // Output must be named index.js — Lambda handler is set to "index.handler"
  const outDir  = resolve(distDir, name);
  const outfile = resolve(outDir, "index.js");
  const zipfile = resolve(distDir, `${name}.zip`);

  mkdirSync(outDir, { recursive: true });

  await build({
    entryPoints: [resolve(__dirname, name, "index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile,
    // AWS SDK v3 is provided by the Lambda runtime — exclude to keep zips small
    external: ["@aws-sdk/*"],
  });

  execSync(`zip -j "${zipfile}" "${outfile}"`);
  console.log(`✓ ${name}.zip  (${execSync(`du -sh "${zipfile}"`).toString().split("\t")[0].trim()})`);
}
