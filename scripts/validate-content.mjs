import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const projectRoot = path.resolve(import.meta.dirname, "..");
const contentRoot = path.join(projectRoot, "src", "content");
const expectedImages = {
  single: 1,
  pair: 2,
  triptych: 3,
};
const errors = [];

async function entryFiles(collection) {
  const root = path.join(contentRoot, collection);
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      slug: entry.name,
      filePath: path.join(root, entry.name, "index.mdoc"),
    }));
}

function resolveAsset(reference) {
  if (!reference?.startsWith("@assets/")) return null;
  return path.join(
    projectRoot,
    "src",
    "assets",
    reference.slice("@assets/".length),
  );
}

async function requireAsset(reference, label) {
  const assetPath = resolveAsset(reference);
  if (!assetPath) {
    errors.push(`${label} 必须引用 @assets/ 下的本地图片。`);
    return;
  }

  try {
    await access(assetPath);
  } catch {
    errors.push(`${label} 引用的图片不存在：${reference}`);
  }
}

async function validateGallery({ slug, filePath }) {
  const source = await readFile(filePath, "utf8");
  const { data } = matter(source);
  const label = `相册 ${slug}`;
  const publication = data.publication ?? {};
  const isPublished = publication.draft === false;

  if (!data.workingTitle?.trim()) {
    errors.push(`${label} 缺少后台工作名称。`);
  }

  if (isPublished) {
    if (!publication.title?.trim()) {
      errors.push(`${label}准备发布，但缺少正式标题。`);
    }
    if (!publication.date) {
      errors.push(`${label}准备发布，但缺少拍摄日期。`);
    }
    if (!publication.cover) {
      errors.push(`${label}准备发布，但缺少首页封面。`);
    }
  }
  if (publication.cover) {
    await requireAsset(publication.cover, `${label}封面`);
  }

  const photos = data.composition?.photos;
  const blocks = data.composition?.blocks;
  if (!Array.isArray(photos)) {
    if (isPublished) errors.push(`${label}准备发布，但照片库为空。`);
    return;
  }
  if (!Array.isArray(blocks)) {
    if (isPublished) errors.push(`${label}准备发布，但还没有内容块。`);
    return;
  }
  if (isPublished && photos.length === 0) {
    errors.push(`${label}准备发布，但照片库为空。`);
  }
  if (isPublished && blocks.length === 0) {
    errors.push(`${label}准备发布，但还没有内容块。`);
  }

  const photoIds = new Set();
  for (const [photoIndex, photo] of photos.entries()) {
    if (!photo.id?.trim()) {
      errors.push(`${label}照片库第 ${photoIndex + 1} 张缺少照片 ID。`);
    } else if (photoIds.has(photo.id)) {
      errors.push(`${label}照片 ID 重复：${photo.id}。`);
    } else {
      photoIds.add(photo.id);
    }
    if (!photo.alt?.trim()) {
      errors.push(`${label}照片库第 ${photoIndex + 1} 张缺少替代文字。`);
    }
    await requireAsset(photo.image, `${label}照片库第 ${photoIndex + 1} 张`);
  }

  for (const [blockIndex, block] of blocks.entries()) {
    if (!["images", "text", "spacer"].includes(block.type)) {
      if (isPublished) {
        errors.push(`${label}第 ${blockIndex + 1} 个内容块类型无效。`);
      }
      continue;
    }

    if (block.type === "text") {
      if (isPublished && !block.text?.trim()) {
        errors.push(`${label}第 ${blockIndex + 1} 个文字块内容为空。`);
      }
      continue;
    }

    if (block.type === "spacer") continue;

    const count = expectedImages[block.layout];
    if (!count) {
      if (isPublished) {
        errors.push(`${label}第 ${blockIndex + 1} 个照片块布局类型无效。`);
      }
      continue;
    }
    if (!Array.isArray(block.photoIds) || block.photoIds.length !== count) {
      if (isPublished) {
        errors.push(
          `${label}第 ${blockIndex + 1} 个照片块应有 ${count} 张照片，实际为 ${block.photoIds?.length ?? 0} 张。`,
        );
      }
      continue;
    }

    for (const photoId of block.photoIds) {
      if (isPublished && !photoIds.has(photoId)) {
        errors.push(
          `${label}第 ${blockIndex + 1} 个照片块引用了不存在的照片：${photoId}。`,
        );
      }
    }
  }
}

async function validateArticle({ slug, filePath }) {
  const source = await readFile(filePath, "utf8");
  const { data, content } = matter(source);
  if (!data.title || !data.date) {
    errors.push(`文章 ${slug} 缺少 title 或 date。`);
  }
  if (!content.trim()) {
    errors.push(`文章 ${slug} 正文为空。`);
  }
}

async function main() {
  const [galleries, articles] = await Promise.all([
    entryFiles("galleries"),
    entryFiles("articles"),
  ]);

  await Promise.all([
    ...galleries.map(validateGallery),
    ...articles.map(validateArticle),
  ]);

  if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`内容检查通过：${galleries.length} 个相册，${articles.length} 篇文章。`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
