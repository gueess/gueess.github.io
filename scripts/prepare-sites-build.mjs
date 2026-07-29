import { copyFile, mkdir } from "node:fs/promises";

const serverDirectory = new URL("../dist/server/", import.meta.url);

await mkdir(serverDirectory, { recursive: true });
await copyFile(
  new URL("./sites-worker.mjs", import.meta.url),
  new URL("index.js", serverDirectory),
);
