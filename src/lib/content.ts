import { getCollection, type CollectionEntry } from "astro:content";

type Gallery = CollectionEntry<"galleries">;

export type PublishedGallery = Gallery & {
  data: Gallery["data"] & {
    publication: Gallery["data"]["publication"] & {
      title: string;
      date: Date;
      cover: NonNullable<Gallery["data"]["publication"]["cover"]>;
      draft: false;
    };
  };
};

export function contentSlug(entry: { id: string }) {
  return entry.id.replace(/\/index$/, "");
}

export function isPublishedGallery(
  gallery: Gallery,
): gallery is PublishedGallery {
  const publication = gallery.data.publication;
  return (
    publication.draft === false &&
    publication.title.trim().length > 0 &&
    publication.date instanceof Date &&
    publication.cover !== undefined
  );
}

export async function getPublishedGalleries() {
  const galleries = (await getCollection("galleries")).filter(
    isPublishedGallery,
  );

  return galleries.sort((a, b) => {
    if (
      a.data.publication.featuredOrder !== b.data.publication.featuredOrder
    ) {
      return (
        a.data.publication.featuredOrder - b.data.publication.featuredOrder
      );
    }

    return (
      b.data.publication.date.getTime() - a.data.publication.date.getTime()
    );
  });
}

export async function getSiteSettings() {
  const entries = await getCollection("site");

  return (
    entries[0]?.data ?? {
      siteName: "JOE / PHOTOGRAPHS",
      introduction: "这里存放我拍下的照片，也留下一些文字。",
      email: "joooooe-z@foxmail.com",
    }
  );
}
