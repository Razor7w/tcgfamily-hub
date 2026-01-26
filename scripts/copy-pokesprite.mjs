#!/usr/bin/env node
/**
 * Copia los sprites de Pokémon desde pokesprite-images a public/pokesprite.
 * Se usa para servir sprites estáticamente y evitar warnings de Turbopack
 * por patrones dinámicos (join + readFile) en la API route.
 *
 * Ejecutar: node scripts/copy-pokesprite.mjs
 * O vía: npm run copy-pokesprite
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nodeModules = path.join(root, "node_modules", "pokesprite-images");
const destBase = path.join(root, "public", "pokesprite");

const SOURCES = [
  { src: "pokemon-gen8", dest: "gen8" },
  { src: "pokemon-gen7x", dest: "gen7x" },
];

async function copyRecursive(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(srcDir, e.name);
    const destPath = path.join(destDir, e.name);
    if (e.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  try {
    const pkgStat = await fs.stat(nodeModules).catch(() => null);
    if (!pkgStat?.isDirectory()) {
      console.warn("[copy-pokesprite] pokesprite-images not found; skipping.");
      return;
    }
    await fs.mkdir(destBase, { recursive: true });
    for (const { src, dest } of SOURCES) {
      const srcPath = path.join(nodeModules, src);
      const destPath = path.join(destBase, dest);
      const stat = await fs.stat(srcPath).catch(() => null);
      if (!stat?.isDirectory()) {
        console.warn(`[copy-pokesprite] Skip ${src}: not found or not a directory`);
        continue;
      }
      await copyRecursive(srcPath, destPath);
      console.log(`[copy-pokesprite] Copied ${src} -> public/pokesprite/${dest}`);
    }
  } catch (err) {
    console.error("[copy-pokesprite] Error:", err.message);
    process.exit(1);
  }
}

main();
