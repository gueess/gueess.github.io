import { useEffect, useRef, useState } from "react";

interface LightboxPhoto {
  src: string;
  alt: string;
  caption?: string;
}

interface Props {
  photos: LightboxPhoto[];
}

export default function Lightbox({ photos }: Props) {
  const [current, setCurrent] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pointerStartRef = useRef<number | null>(null);

  const close = () => setCurrent(null);
  const move = (direction: number) => {
    setCurrent((value) => {
      if (value === null) return null;
      return (value + direction + photos.length) % photos.length;
    });
  };

  useEffect(() => {
    const openFromTrigger = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-lightbox-trigger]",
      );

      if (!target) return;
      const index = Number(target.dataset.lightboxIndex);
      if (!Number.isInteger(index)) return;
      previousFocusRef.current = target;
      setCurrent(index);
    };

    document.addEventListener("click", openFromTrigger);
    return () => document.removeEventListener("click", openFromTrigger);
  }, []);

  useEffect(() => {
    if (current === null) {
      document.documentElement.classList.remove("lightbox-open");
      previousFocusRef.current?.focus();
      return;
    }

    document.documentElement.classList.add("lightbox-open");
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("lightbox-open");
    };
  }, [current]);

  if (current === null || photos.length === 0) return null;

  const photo = photos[current];

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="照片大图"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
      onPointerDown={(event) => {
        pointerStartRef.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStartRef.current === null) return;
        const distance = event.clientX - pointerStartRef.current;
        if (Math.abs(distance) > 48) move(distance > 0 ? -1 : 1);
        pointerStartRef.current = null;
      }}
      onPointerCancel={() => {
        pointerStartRef.current = null;
      }}
    >
      <button
        ref={closeButtonRef}
        className="lightbox__close"
        type="button"
        onClick={close}
        aria-label="关闭大图"
      >
        关闭
      </button>
      {photos.length > 1 && (
        <>
          <button
            className="lightbox__nav lightbox__nav--previous"
            type="button"
            onClick={() => move(-1)}
            aria-label="上一张"
          >
            ←
          </button>
          <button
            className="lightbox__nav lightbox__nav--next"
            type="button"
            onClick={() => move(1)}
            aria-label="下一张"
          >
            →
          </button>
        </>
      )}
      <figure className="lightbox__figure">
        <img src={photo.src} alt={photo.alt} />
        {(photo.caption || photos.length > 1) && (
          <figcaption>
            <span>{photo.caption}</span>
            <span>
              {current + 1} / {photos.length}
            </span>
          </figcaption>
        )}
      </figure>
    </div>
  );
}
