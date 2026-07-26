import { fields, type PreviewProps } from "@keystatic/core";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./gallery-composition.css";

const galleryAsset = {
  directory: "src/assets/galleries",
  publicPath: "@assets/galleries/",
};

const photoField = fields.object(
  {
    id: fields.text({
      label: "照片 ID",
      validation: { isRequired: true },
    }),
    image: fields.image({
      label: "照片",
      ...galleryAsset,
      validation: { isRequired: true },
    }),
    alt: fields.text({
      label: "替代文字",
      description: "简短描述画面，供无障碍阅读和图片加载失败时使用。",
      validation: { isRequired: true },
    }),
    caption: fields.text({
      label: "图片说明",
      multiline: true,
    }),
    focusX: fields.integer({
      label: "横向焦点",
      defaultValue: 50,
      validation: { min: 0, max: 100 },
    }),
    focusY: fields.integer({
      label: "纵向焦点",
      defaultValue: 50,
      validation: { min: 0, max: 100 },
    }),
  },
  { label: "照片" },
);

const contentBlockField = fields.object(
  {
    type: fields.select({
      label: "内容类型",
      options: [
        { label: "照片", value: "images" },
        { label: "文字", value: "text" },
        { label: "留白", value: "spacer" },
      ],
      defaultValue: "images",
    }),
    layout: fields.select({
      label: "照片数量",
      options: [
        { label: "一张", value: "single" },
        { label: "两张", value: "pair" },
        { label: "三张", value: "triptych" },
      ],
      defaultValue: "single",
    }),
    photoIds: fields.array(fields.text({ label: "照片 ID" }), {
      label: "区块照片",
    }),
    variant: fields.select({
      label: "尺寸关系",
      options: [
        { label: "等宽", value: "equal" },
        { label: "左侧为主", value: "lead-left" },
        { label: "右侧为主", value: "lead-right" },
      ],
      defaultValue: "equal",
    }),
    width: fields.select({
      label: "区块宽度",
      options: [
        { label: "收窄", value: "contained" },
        { label: "常规", value: "wide" },
        { label: "通栏", value: "full" },
      ],
      defaultValue: "wide",
    }),
    gap: fields.select({
      label: "照片间距",
      options: [
        { label: "紧凑", value: "tight" },
        { label: "常规", value: "normal" },
        { label: "宽松", value: "wide" },
      ],
      defaultValue: "normal",
    }),
    aspect: fields.select({
      label: "画面比例",
      options: [
        { label: "保留原比例", value: "natural" },
        { label: "横向 3:2", value: "landscape" },
        { label: "方形", value: "square" },
        { label: "纵向 4:5", value: "portrait" },
      ],
      defaultValue: "natural",
    }),
    text: fields.text({
      label: "文字",
      multiline: true,
    }),
    textSize: fields.select({
      label: "文字大小",
      options: [
        { label: "小", value: "small" },
        { label: "中", value: "medium" },
        { label: "大", value: "large" },
      ],
      defaultValue: "medium",
    }),
    textWidth: fields.select({
      label: "文字宽度",
      options: [
        { label: "窄", value: "narrow" },
        { label: "中", value: "medium" },
        { label: "宽", value: "wide" },
      ],
      defaultValue: "medium",
    }),
    textAlign: fields.select({
      label: "文字对齐",
      options: [
        { label: "左对齐", value: "left" },
        { label: "居中", value: "center" },
        { label: "右对齐", value: "right" },
      ],
      defaultValue: "left",
    }),
    spacing: fields.select({
      label: "上下留白",
      options: [
        { label: "小", value: "small" },
        { label: "中", value: "medium" },
        { label: "大", value: "large" },
        { label: "超大", value: "xlarge" },
      ],
      defaultValue: "medium",
    }),
  },
  { label: "内容块" },
);

const compositionField = fields.object(
  {
    photos: fields.array(photoField, {
      label: "照片库",
      slugField: "id",
      itemLabel: (props) => props.fields.alt.value || props.fields.id.value,
    }),
    blocks: fields.array(contentBlockField, {
      label: "页面内容",
      itemLabel: (props) => {
        const labels = {
          images: "照片",
          text: "文字",
          spacer: "留白",
        } as const;
        return labels[props.fields.type.value];
      },
    }),
  },
  {
    label: "可视化编排",
    description: "从左侧照片库把照片拖进画布，并在照片之间插入文字或留白。",
  },
);

type ComposerProps = PreviewProps<typeof compositionField> & {
  autoFocus?: boolean;
  forceValidation?: boolean;
};
type PhotoPreview = ComposerProps["fields"]["photos"]["elements"][number];
type BlockPreview = ComposerProps["fields"]["blocks"]["elements"][number];
type ImageValue = PhotoPreview["fields"]["image"]["value"];
type CanvasMode = "desktop" | "tablet" | "mobile";

const PHOTO_MIME = "application/x-joe-gallery-photo";
const BLOCK_MIME = "application/x-joe-gallery-block";

function mimeType(extension: string) {
  const normalized = extension.toLowerCase();
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "gif") return "image/gif";
  if (normalized === "avif") return "image/avif";
  return "image/jpeg";
}

function cleanId(filename: string) {
  return (
    filename
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "photo"
  );
}

function labelFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function expectedPhotoCount(layout: string) {
  if (layout === "pair") return 2;
  if (layout === "triptych") return 3;
  return 1;
}

function preserveItems<T extends { key: string }>(items: readonly T[]) {
  return items.map((item) => ({ key: item.key }));
}

function photoIdsFor(block: BlockPreview) {
  return block.fields.photoIds.elements.map((item) => item.value);
}

function usePhotoUrls(photos: readonly PhotoPreview[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    const created: string[] = [];

    for (const photo of photos) {
      const value = photo.fields.image.value;
      if (!value) continue;
      const url = URL.createObjectURL(
        new Blob([value.data.slice().buffer], {
          type: mimeType(value.extension),
        }),
      );
      next[photo.fields.id.value] = url;
      created.push(url);
    }

    setUrls(next);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  return urls;
}

function VisualGalleryComposer({ fields: fieldProps }: ComposerProps) {
  const photos = fieldProps.photos;
  const blocks = fieldProps.blocks;
  const photoUrls = usePhotoUrls(photos.elements);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("desktop");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(
    photos.elements[0]?.fields.id.value ?? null,
  );
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(
    blocks.elements[0]?.key ?? null,
  );
  const [notice, setNotice] = useState(
    "把左侧照片拖进画布，或先添加一个文字块。",
  );

  const photosById = useMemo(
    () =>
      new Map(
        photos.elements.map((photo) => [photo.fields.id.value, photo] as const),
      ),
    [photos.elements],
  );
  const usedPhotoIds = useMemo(
    () =>
      new Set(
        blocks.elements.flatMap((block) =>
          block.fields.type.value === "images" ? photoIdsFor(block) : [],
        ),
      ),
    [blocks.elements],
  );
  const selectedPhoto =
    (selectedPhotoId && photosById.get(selectedPhotoId)) || null;
  const selectedBlock =
    blocks.elements.find((block) => block.key === selectedBlockKey) || null;

  useEffect(() => {
    if (selectedPhotoId && !photosById.has(selectedPhotoId)) {
      setSelectedPhotoId(photos.elements[0]?.fields.id.value ?? null);
    }
    if (
      selectedBlockKey &&
      !blocks.elements.some((block) => block.key === selectedBlockKey)
    ) {
      setSelectedBlockKey(blocks.elements[0]?.key ?? null);
    }
  }, [
    blocks.elements,
    photos.elements,
    photosById,
    selectedBlockKey,
    selectedPhotoId,
  ]);

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const usedIds = new Set(photos.elements.map((photo) => photo.fields.id.value));
    const timestamp = Date.now().toString(36);
    const additions = await Promise.all(
      files.map(async (file, index) => {
        const originalId = cleanId(file.name);
        let id = originalId;
        let suffix = 2;
        while (usedIds.has(id)) {
          id = `${originalId}-${suffix}`;
          suffix += 1;
        }
        usedIds.add(id);
        const extension = file.name.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || "jpg";
        const storedFilename = `${timestamp}-${index + 1}-${id}.${extension}`;

        return {
          key: undefined,
          value: {
            id,
            image: {
              data: new Uint8Array(await file.arrayBuffer()),
              extension,
              filename: storedFilename,
            } satisfies NonNullable<ImageValue>,
            alt: labelFromFilename(file.name),
            caption: "",
            focusX: 50,
            focusY: 50,
          },
        };
      }),
    );

    photos.onChange([...preserveItems(photos.elements), ...additions]);
    setSelectedPhotoId(additions[0]?.value.id ?? null);
    setNotice(`已加入 ${additions.length} 张照片。现在可以把它们拖进画布。`);
    event.target.value = "";
  }

  function addBlock(type: "images" | "text" | "spacer", photoId?: string) {
    const value = {
      type,
      layout: "single",
      photoIds: photoId ? [{ key: undefined, value: photoId }] : [],
      variant: "equal",
      width: "wide",
      gap: "normal",
      aspect: "natural",
      text: "",
      textSize: "medium",
      textWidth: "medium",
      textAlign: "left",
      spacing: "medium",
    } as const;

    blocks.onChange([
      ...preserveItems(blocks.elements),
      { key: undefined, value },
    ]);
    setNotice(
      type === "text"
        ? "已添加文字块。"
        : type === "spacer"
          ? "已添加留白块。"
          : "已添加照片块。",
    );
  }

  function removeBlock(block: BlockPreview) {
    blocks.onChange(
      blocks.elements
        .filter((item) => item.key !== block.key)
        .map((item) => ({ key: item.key })),
    );
    setNotice("内容块已移除，照片仍保留在照片库中。");
  }

  function moveBlock(block: BlockPreview, direction: -1 | 1) {
    const current = blocks.elements.findIndex((item) => item.key === block.key);
    const destination = current + direction;
    if (current < 0 || destination < 0 || destination >= blocks.elements.length) {
      return;
    }
    const reordered = [...blocks.elements];
    [reordered[current], reordered[destination]] = [
      reordered[destination],
      reordered[current],
    ];
    blocks.onChange(reordered.map((item) => ({ key: item.key })));
  }

  function reorderBlock(draggedKey: string, targetKey: string) {
    if (!draggedKey || draggedKey === targetKey) return;
    const reordered = [...blocks.elements];
    const from = reordered.findIndex((item) => item.key === draggedKey);
    const to = reordered.findIndex((item) => item.key === targetKey);
    if (from < 0 || to < 0) return;
    const [dragged] = reordered.splice(from, 1);
    reordered.splice(to, 0, dragged);
    blocks.onChange(reordered.map((item) => ({ key: item.key })));
  }

  function setBlockPhotoIds(block: BlockPreview, ids: string[]) {
    const current = [...block.fields.photoIds.elements];
    const unused = new Set(current.map((item) => item.key));
    const next = ids.map((id) => {
      const existing = current.find(
        (item) => item.value === id && unused.has(item.key),
      );
      if (existing) {
        unused.delete(existing.key);
        return { key: existing.key };
      }
      return { key: undefined, value: id };
    });
    block.fields.photoIds.onChange(next);
  }

  function placePhoto(block: BlockPreview, photoId: string, slotIndex: number) {
    const capacity = expectedPhotoCount(block.fields.layout.value);
    const next = photoIdsFor(block).filter((id) => id !== photoId);
    if (slotIndex < next.length) next[slotIndex] = photoId;
    else next.push(photoId);
    setBlockPhotoIds(block, next.slice(0, capacity));
    setSelectedBlockKey(block.key);
    setSelectedPhotoId(photoId);
    setNotice("照片已经放入这个内容块。");
  }

  function removePhotoFromBlock(block: BlockPreview, photoId: string) {
    setBlockPhotoIds(
      block,
      photoIdsFor(block).filter((id) => id !== photoId),
    );
  }

  function removePhoto(photo: PhotoPreview) {
    const id = photo.fields.id.value;
    if (usedPhotoIds.has(id)) {
      setNotice("这张照片仍在画布中，请先从对应内容块移除。");
      return;
    }
    photos.onChange(
      photos.elements
        .filter((item) => item.key !== photo.key)
        .map((item) => ({ key: item.key })),
    );
    setNotice("照片已从照片库移除。");
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    const photoId = event.dataTransfer.getData(PHOTO_MIME);
    if (!photoId) return;
    event.preventDefault();
    addBlock("images", photoId);
  }

  function openPublishedPreview() {
    const match = window.location.pathname.match(
      /\/keystatic\/collection\/galleries\/item\/([^/]+)/,
    );
    if (!match) {
      setNotice("请先保存这份草稿，再点击“预览最终网页”。");
      return;
    }

    const slug = decodeURIComponent(match[1]);
    window.open(
      `/photos/${encodeURIComponent(slug)}/`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <section className="vgc-shell" aria-label="相册可视化编排器">
      <header className="vgc-topbar">
        <div>
          <p className="vgc-eyebrow">阶段 1 · 照片编排</p>
          <h2>相册编排</h2>
        </div>
        <div className="vgc-topbar-actions">
          <div className="vgc-viewport-switch" aria-label="画布宽度">
            {(["desktop", "tablet", "mobile"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={canvasMode === mode ? "is-active" : ""}
                onClick={() => setCanvasMode(mode)}
              >
                {mode === "desktop"
                  ? "桌面"
                  : mode === "tablet"
                    ? "平板"
                    : "手机"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="vgc-preview-link"
            onClick={openPublishedPreview}
          >
            预览最终网页 ↗
          </button>
        </div>
      </header>

      <div className="vgc-workspace">
        <aside className="vgc-panel vgc-library">
          <div className="vgc-panel-heading">
            <div>
              <p className="vgc-eyebrow">01 / 照片库</p>
              <strong>{photos.elements.length} 张</strong>
            </div>
            <button type="button" onClick={() => uploadInput.current?.click()}>
              上传照片
            </button>
            <input
              ref={uploadInput}
              type="file"
              accept="image/*"
              multiple
              onChange={uploadPhotos}
              hidden
            />
          </div>

          <p className="vgc-help">可以一次选择多张，再把缩略图拖到中间画布。</p>
          <div className="vgc-photo-grid">
            {photos.elements.map((photo) => {
              const id = photo.fields.id.value;
              const isSelected = selectedPhotoId === id;
              return (
                <button
                  key={photo.key}
                  type="button"
                  draggable
                  className={`vgc-thumb ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedPhotoId(id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(PHOTO_MIME, id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  aria-label={`选择并拖动照片：${photo.fields.alt.value || id}`}
                >
                  {photoUrls[id] ? (
                    <img src={photoUrls[id]} alt="" />
                  ) : (
                    <span>等待图片</span>
                  )}
                  <small>{usedPhotoIds.has(id) ? "已使用" : "未排版"}</small>
                </button>
              );
            })}
          </div>
          {photos.elements.length === 0 && (
            <div className="vgc-empty">先上传一组照片。</div>
          )}
        </aside>

        <div className="vgc-stage-panel">
          <div className="vgc-block-toolbar">
            <span>插入：</span>
            <button type="button" onClick={() => addBlock("images")}>
              照片块
            </button>
            <button type="button" onClick={() => addBlock("text")}>
              文字块
            </button>
            <button type="button" onClick={() => addBlock("spacer")}>
              留白
            </button>
          </div>

          <div className="vgc-stage-tip" role="note">
            <strong>使用提示</strong>
            <span>
              从左侧拖入照片，选中内容块后在右侧调整。保存草稿后，可用右上角按钮查看正式网页效果。
            </span>
          </div>

          <div className="vgc-stage-scroll">
            <div
              className={`vgc-page vgc-page--${canvasMode}`}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes(PHOTO_MIME)) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }
              }}
              onDrop={handleCanvasDrop}
            >
              {blocks.elements.map((block, blockIndex) => {
                const type = block.fields.type.value;
                const isSelected = selectedBlockKey === block.key;
                const ids = photoIdsFor(block);
                const count = expectedPhotoCount(block.fields.layout.value);

                return (
                  <article
                    key={block.key}
                    draggable
                    className={`vgc-canvas-block ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedBlockKey(block.key)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(BLOCK_MIME, block.key);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      if (event.dataTransfer.types.includes(BLOCK_MIME)) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(event) => {
                      const draggedKey = event.dataTransfer.getData(BLOCK_MIME);
                      if (!draggedKey) return;
                      event.preventDefault();
                      event.stopPropagation();
                      reorderBlock(draggedKey, block.key);
                    }}
                  >
                    <header className="vgc-block-header">
                      <button
                        type="button"
                        className="vgc-drag-handle"
                        aria-label={`拖动第 ${blockIndex + 1} 个内容块`}
                      >
                        ⠿
                      </button>
                      <span>
                        {type === "images"
                          ? `${block.fields.layout.value === "single" ? "单图" : block.fields.layout.value === "pair" ? "双图" : "三图"}块`
                          : type === "text"
                            ? "文字块"
                            : "留白块"}
                      </span>
                      <div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            moveBlock(block, -1);
                          }}
                          disabled={blockIndex === 0}
                          aria-label="向上移动"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            moveBlock(block, 1);
                          }}
                          disabled={blockIndex === blocks.elements.length - 1}
                          aria-label="向下移动"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeBlock(block);
                          }}
                          aria-label="删除内容块"
                        >
                          ×
                        </button>
                      </div>
                    </header>

                    {type === "images" && (
                      <div
                        className={[
                          "vgc-image-block",
                          `vgc-image-block--${block.fields.layout.value}`,
                          `vgc-image-block--${block.fields.variant.value}`,
                          `vgc-image-block--${block.fields.width.value}`,
                          `vgc-image-block--gap-${block.fields.gap.value}`,
                        ].join(" ")}
                      >
                        {Array.from({ length: count }, (_, slotIndex) => {
                          const id = ids[slotIndex];
                          const photo = id ? photosById.get(id) : null;
                          return (
                            <div
                              key={`${block.key}-${slotIndex}`}
                              className={`vgc-photo-slot vgc-photo-slot--${block.fields.aspect.value}`}
                              onDragOver={(event) => {
                                if (
                                  event.dataTransfer.types.includes(PHOTO_MIME)
                                ) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  event.dataTransfer.dropEffect = "copy";
                                }
                              }}
                              onDrop={(event) => {
                                const photoId =
                                  event.dataTransfer.getData(PHOTO_MIME);
                                if (!photoId) return;
                                event.preventDefault();
                                event.stopPropagation();
                                placePhoto(block, photoId, slotIndex);
                              }}
                            >
                              {photo && photoUrls[id] ? (
                                <>
                                  <button
                                    type="button"
                                    className="vgc-photo-preview"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedPhotoId(id);
                                    }}
                                  >
                                    <img
                                      src={photoUrls[id]}
                                      alt=""
                                      style={{
                                        objectPosition: `${photo.fields.focusX.value ?? 50}% ${photo.fields.focusY.value ?? 50}%`,
                                      }}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    className="vgc-remove-from-block"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removePhotoFromBlock(block, id);
                                    }}
                                    aria-label="从这个内容块移除照片"
                                  >
                                    ×
                                  </button>
                                </>
                              ) : (
                                <span>拖一张照片到这里</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {type === "text" && (
                      <div
                        className={[
                          "vgc-text-preview",
                          `vgc-text-size--${block.fields.textSize.value}`,
                          `vgc-text-width--${block.fields.textWidth.value}`,
                          `vgc-text-preview--${block.fields.textAlign.value}`,
                          `vgc-spacing--${block.fields.spacing.value}`,
                        ].join(" ")}
                      >
                        {block.fields.text.value || "点击右侧，在这里写一小段文字。"}
                      </div>
                    )}

                    {type === "spacer" && (
                      <div
                        className={`vgc-spacer-preview vgc-spacing--${block.fields.spacing.value}`}
                      >
                        <span>留白</span>
                      </div>
                    )}
                  </article>
                );
              })}

              {blocks.elements.length === 0 && (
                <div className="vgc-canvas-empty">
                  <strong>画布还是空的</strong>
                  <p>拖一张照片进来，或者从上方插入文字块。</p>
                </div>
              )}

              <div className="vgc-drop-tail">
                把照片拖到这里，会自动创建一个新的单图块
              </div>
            </div>
          </div>
        </div>

        <aside className="vgc-panel vgc-inspector">
          <p className="vgc-eyebrow">02 / 属性</p>

          {selectedBlock && (
            <div className="vgc-inspector-section">
              <div className="vgc-inspector-title">
                <strong>当前内容块</strong>
                <span>
                  {selectedBlock.fields.type.value === "images"
                    ? "照片"
                    : selectedBlock.fields.type.value === "text"
                      ? "文字"
                      : "留白"}
                </span>
              </div>

              {selectedBlock.fields.type.value === "images" && (
                <>
                  <label>
                    照片数量
                    <select
                      value={selectedBlock.fields.layout.value}
                      onChange={(event) => {
                        const layout = event.target.value as
                          | "single"
                          | "pair"
                          | "triptych";
                        selectedBlock.fields.layout.onChange(layout);
                        setBlockPhotoIds(
                          selectedBlock,
                          photoIdsFor(selectedBlock).slice(
                            0,
                            expectedPhotoCount(layout),
                          ),
                        );
                      }}
                    >
                      <option value="single">一张</option>
                      <option value="pair">两张</option>
                      <option value="triptych">三张</option>
                    </select>
                  </label>
                  <label>
                    尺寸关系
                    <select
                      value={selectedBlock.fields.variant.value}
                      onChange={(event) =>
                        selectedBlock.fields.variant.onChange(
                          event.target.value as
                            | "equal"
                            | "lead-left"
                            | "lead-right",
                        )
                      }
                    >
                      <option value="equal">等宽</option>
                      <option value="lead-left">左侧为主</option>
                      <option value="lead-right">右侧为主</option>
                    </select>
                  </label>
                  <label>
                    区块宽度
                    <select
                      value={selectedBlock.fields.width.value}
                      onChange={(event) =>
                        selectedBlock.fields.width.onChange(
                          event.target.value as "contained" | "wide" | "full",
                        )
                      }
                    >
                      <option value="contained">收窄</option>
                      <option value="wide">常规</option>
                      <option value="full">通栏</option>
                    </select>
                  </label>
                  <label>
                    图片间距
                    <select
                      value={selectedBlock.fields.gap.value}
                      onChange={(event) =>
                        selectedBlock.fields.gap.onChange(
                          event.target.value as "tight" | "normal" | "wide",
                        )
                      }
                    >
                      <option value="tight">紧凑</option>
                      <option value="normal">常规</option>
                      <option value="wide">宽松</option>
                    </select>
                  </label>
                  <label>
                    画面比例
                    <select
                      value={selectedBlock.fields.aspect.value}
                      onChange={(event) =>
                        selectedBlock.fields.aspect.onChange(
                          event.target.value as
                            | "natural"
                            | "landscape"
                            | "square"
                            | "portrait",
                        )
                      }
                    >
                      <option value="natural">保留原比例</option>
                      <option value="landscape">横向 3:2</option>
                      <option value="square">方形</option>
                      <option value="portrait">纵向 4:5</option>
                    </select>
                  </label>
                </>
              )}

              {selectedBlock.fields.type.value === "text" && (
                <>
                  <label>
                    文字内容
                    <textarea
                      rows={7}
                      value={selectedBlock.fields.text.value}
                      onChange={(event) =>
                        selectedBlock.fields.text.onChange(event.target.value)
                      }
                      placeholder="写一句话、一段旁白，或者一个章节标题……"
                    />
                  </label>
                  <label>
                    文字大小
                    <select
                      value={selectedBlock.fields.textSize.value}
                      onChange={(event) =>
                        selectedBlock.fields.textSize.onChange(
                          event.target.value as "small" | "medium" | "large",
                        )
                      }
                    >
                      <option value="small">小</option>
                      <option value="medium">中</option>
                      <option value="large">大</option>
                    </select>
                  </label>
                  <label>
                    文字宽度
                    <select
                      value={selectedBlock.fields.textWidth.value}
                      onChange={(event) =>
                        selectedBlock.fields.textWidth.onChange(
                          event.target.value as "narrow" | "medium" | "wide",
                        )
                      }
                    >
                      <option value="narrow">窄</option>
                      <option value="medium">中</option>
                      <option value="wide">宽</option>
                    </select>
                  </label>
                  <label>
                    对齐
                    <select
                      value={selectedBlock.fields.textAlign.value}
                      onChange={(event) =>
                        selectedBlock.fields.textAlign.onChange(
                          event.target.value as "left" | "center" | "right",
                        )
                      }
                    >
                      <option value="left">左对齐</option>
                      <option value="center">居中</option>
                      <option value="right">右对齐</option>
                    </select>
                  </label>
                </>
              )}

              {selectedBlock.fields.type.value !== "images" && (
                <label>
                  上下留白
                  <select
                    value={selectedBlock.fields.spacing.value}
                    onChange={(event) =>
                      selectedBlock.fields.spacing.onChange(
                        event.target.value as
                          | "small"
                          | "medium"
                          | "large"
                          | "xlarge",
                      )
                    }
                  >
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                    <option value="xlarge">超大</option>
                  </select>
                </label>
              )}
            </div>
          )}

          {selectedPhoto && (
            <div className="vgc-inspector-section">
              <div className="vgc-inspector-title">
                <strong>当前照片</strong>
                <span>{selectedPhoto.fields.id.value}</span>
              </div>
              {photoUrls[selectedPhoto.fields.id.value] && (
                <img
                  className="vgc-inspector-image"
                  src={photoUrls[selectedPhoto.fields.id.value]}
                  alt=""
                />
              )}
              <label>
                替代文字
                <input
                  value={selectedPhoto.fields.alt.value}
                  onChange={(event) =>
                    selectedPhoto.fields.alt.onChange(event.target.value)
                  }
                />
              </label>
              <label>
                图片说明
                <textarea
                  rows={3}
                  value={selectedPhoto.fields.caption.value}
                  onChange={(event) =>
                    selectedPhoto.fields.caption.onChange(event.target.value)
                  }
                />
              </label>
              <label>
                横向焦点：{selectedPhoto.fields.focusX.value ?? 50}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedPhoto.fields.focusX.value ?? 50}
                  onChange={(event) =>
                    selectedPhoto.fields.focusX.onChange(
                      Number(event.target.value),
                    )
                  }
                />
              </label>
              <label>
                纵向焦点：{selectedPhoto.fields.focusY.value ?? 50}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedPhoto.fields.focusY.value ?? 50}
                  onChange={(event) =>
                    selectedPhoto.fields.focusY.onChange(
                      Number(event.target.value),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="vgc-danger"
                disabled={usedPhotoIds.has(selectedPhoto.fields.id.value)}
                onClick={() => removePhoto(selectedPhoto)}
              >
                从照片库移除
              </button>
              {usedPhotoIds.has(selectedPhoto.fields.id.value) && (
                <small>先从画布里的内容块移除，才能删除这张照片。</small>
              )}
            </div>
          )}

          {!selectedBlock && !selectedPhoto && (
            <div className="vgc-empty">选择一个内容块或一张照片。</div>
          )}
        </aside>
      </div>

      <footer className="vgc-status" aria-live="polite">
        <span>{notice}</span>
        <strong>排版完成后先保存草稿，再继续填写下方的“阶段 2 · 发布信息”。</strong>
      </footer>
    </section>
  );
}

compositionField.Input = VisualGalleryComposer as typeof compositionField.Input;

export const galleryCompositionField = compositionField;
