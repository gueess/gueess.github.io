import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const galleries = defineCollection({
  loader: glob({
    pattern: "**/index.mdoc",
    base: "./src/content/galleries",
  }),
  schema: ({ image }) => {
    const galleryPhoto = z.object({
      id: z.string().min(1),
      image: image(),
      alt: z.string().min(1),
      caption: z.string().optional().default(""),
      focusX: z.number().min(0).max(100).default(50),
      focusY: z.number().min(0).max(100).default(50),
    });

    const galleryBlock = z.object({
      type: z.enum(["images", "text", "spacer"]),
      layout: z.enum(["single", "pair", "triptych"]).default("single"),
      photoIds: z.array(z.string()).default([]),
      variant: z.enum(["equal", "lead-left", "lead-right"]).default("equal"),
      width: z.enum(["contained", "wide", "full"]).default("wide"),
      gap: z.enum(["tight", "normal", "wide"]).default("normal"),
      aspect: z
        .enum(["natural", "landscape", "square", "portrait"])
        .default("natural"),
      text: z.string().default(""),
      textSize: z.enum(["small", "medium", "large"]).default("medium"),
      textWidth: z.enum(["narrow", "medium", "wide"]).default("medium"),
      textAlign: z.enum(["left", "center", "right"]).default("left"),
      spacing: z
        .enum(["small", "medium", "large", "xlarge"])
        .default("medium"),
    });

    return z.object({
      workingTitle: z.string(),
      composition: z.object({
        photos: z.array(galleryPhoto),
        blocks: z.array(galleryBlock),
      }),
      publication: z.object({
        title: z.string().optional().default(""),
        date: z.preprocess(
          (value) => (value === "" || value == null ? undefined : value),
          z.coerce.date().optional(),
        ),
        location: z.string().optional().default(""),
        summary: z.string().optional().default(""),
        cover: image().optional(),
        featuredOrder: z.number().int().min(0).default(10),
        draft: z.boolean().default(true),
      }),
    });
  },
});

const articles = defineCollection({
  loader: glob({
    pattern: "**/index.mdoc",
    base: "./src/content/articles",
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional().default(""),
    draft: z.boolean().default(true),
    unlisted: z.boolean().default(true),
  }),
});

const site = defineCollection({
  loader: glob({
    pattern: "**/*.{yaml,yml}",
    base: "./src/content/site",
  }),
  schema: z.object({
    siteName: z.string(),
    introduction: z.string(),
    email: z.email(),
  }),
});

export const collections = { galleries, articles, site };
