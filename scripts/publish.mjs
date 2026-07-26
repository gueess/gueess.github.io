import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import process from "node:process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function output(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout.trim();
}

const branch = output("git", ["branch", "--show-current"]);
if (branch !== "main") {
  console.error(`当前分支是 ${branch}。请先合并到 main，再发布正式网站。`);
  process.exit(1);
}

run("npm", ["run", "media:prepare"]);
run("npm", ["run", "check"]);
run("npm", ["run", "build"]);

const status = output("git", ["status", "--short"]);
if (!status) {
  console.log("没有需要发布的新改动。");
  process.exit(0);
}

console.log("\n准备发布以下改动：\n");
console.log(status);

const assumeYes = process.argv.includes("--yes");
const terminal = assumeYes
  ? null
  : createInterface({ input: process.stdin, output: process.stdout });
const answer = assumeYes
  ? "yes"
  : await terminal.question("\n确认提交并发布到 GitHub Pages？输入 yes：");

if (answer.trim().toLowerCase() !== "yes") {
  terminal?.close();
  console.log("已取消发布，文件改动仍保留在本地。");
  process.exit(0);
}

const defaultMessage = `Publish photographs ${new Date().toISOString().slice(0, 10)}`;
const message = assumeYes
  ? defaultMessage
  : (await terminal.question(`提交说明（回车使用“${defaultMessage}”）：`)).trim() ||
    defaultMessage;
terminal?.close();

run("git", ["add", "-A"]);
run("git", ["commit", "-m", message]);
run("git", ["push", "origin", "main"]);
console.log("发布已提交。GitHub Pages 将自动更新。");
