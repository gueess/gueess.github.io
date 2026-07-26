import { createHash } from "node:crypto";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const assetsRoot = path.join(projectRoot, "src", "assets");
const manifestPath = path.join(assetsRoot, ".media-manifest.json");
const supported = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const recipeVersion = "v1-max3200-q84";

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    }),
  );
  return nested.flat();
}

async function hashFile(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return { recipeVersion, files: {} };
  }
}

async function optimise(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const tempPath = `${filePath}.optimising${extension}`;
  let pipeline = sharp(filePath)
    .rotate()
    .resize({
      width: 3200,
      height: 3200,
      fit: "inside",
      withoutEnlargement: true,
    });

  if (extension === ".jpg" || extension === ".jpeg") {
    pipeline = pipeline.jpeg({
      quality: 84,
      progressive: true,
      mozjpeg: true,
    });
  } else if (extension === ".png") {
    pipeline = pipeline.png({
      compressionLevel: 9,
      effort: 8,
    });
  } else {
    pipeline = pipeline.webp({
      quality: 84,
      effort: 5,
    });
  }

  await pipeline.toFile(tempPath);
  await rename(tempPath, filePath);
}

async function main() {
  const manifest = await loadManifest();
  if (manifest.recipeVersion !== recipeVersion) {
    manifest.recipeVersion = recipeVersion;
    manifest.files = {};
  }

  const files = (await listFiles(assetsRoot)).filter((filePath) =>
    supported.has(path.extname(filePath).toLowerCase()),
  );
  let changed = 0;

  for (const filePath of files) {
    const relativePath = path.relative(projectRoot, filePath);
    const beforeHash = await hashFile(filePath);
    if (manifest.files[relativePath] === beforeHash) continue;

    const beforeSize = (await stat(filePath)).size;
    await optimise(filePath);
    const afterSize = (await stat(filePath)).size;
    manifest.files[relativePath] = await hashFile(filePath);
    changed += 1;
    console.log(
      `${relativePath}: ${(beforeSize / 1024 / 1024).toFixed(1)} MB → ${(afterSize / 1024 / 1024).toFixed(1)} MB`,
    );
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(changed === 0 ? "图片已经是最新状态。" : `已处理 ${changed} 张图片。`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
