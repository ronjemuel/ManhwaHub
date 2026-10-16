import { z } from "zod";
export const ratings = ["safe", "suggestive", "mature", "explicit"] as const;
export const formats = ["Manga", "Manhwa", "Manhua", "Webtoon"] as const;
export const statuses = [
  "Ongoing",
  "Completed",
  "Hiatus",
  "Cancelled",
] as const;
export const readingStatuses = [
  "Reading",
  "Plan to Read",
  "Completed",
  "On Hold",
  "Dropped",
] as const;
export const genres = [
  "Action",
  "Adventure",
  "Fantasy",
  "Drama",
  "Romance",
  "Mystery",
  "Sci-Fi",
  "Slice of Life",
] as const;
const text = z.string().max(10000);
const id = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-zA-Z0-9:._|\-]+$/);
export const safeUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      v === "" ||
      /^\/demo\/[a-zA-Z0-9_./-]+$/.test(v) ||
      (() => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      })(),
    "Invalid asset URL",
  );
export const seriesSchema = z
  .object({
    canonicalId: id,
    externalId: id,
    sourceId: id,
    title: text,
    alternativeTitles: z.array(text).max(30),
    description: text,
    cover: safeUrl,
    author: text,
    artist: text,
    genres: z.array(z.string().max(80)).max(40),
    format: z.enum(formats),
    status: z.enum(statuses),
    contentRating: z.enum(ratings),
    language: z.string().max(20),
    sources: z
      .array(z.object({ sourceId: id, externalId: id }))
      .min(1)
      .max(20),
    rating: z.number().min(0).max(10).nullable(),
    chapterCount: z.number().int().min(0).max(100000).nullable(),
    updatedAt: z.string().max(40),
    releasedAt: z.string().max(40),
    url: safeUrl,
    readable: z.boolean(),
    ratingNote: z.string().max(300).optional(),
  })
  .strict();
export type Series = z.infer<typeof seriesSchema>;
export type SearchResult = Series;
export type Genre = string;
export type ContentRating = (typeof ratings)[number];
export interface Chapter {
  id: string;
  seriesId: string;
  sourceId: string;
  number: number | null;
  volume: string | null;
  title: string;
  language: string;
  releasedAt: string | null;
}
export interface Page {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
}
export const readerSettingsSchema = z
  .object({
    mode: z.enum(["vertical", "paged", "rtl"]),
    width: z.number().min(320).max(1200),
    gap: z.number().int().min(0).max(32),
    background: z.enum(["black", "dark", "paper"]),
    preload: z.number().int().min(0).max(3),
    autoNext: z.boolean(),
    saveProgress: z.boolean(),
  })
  .strict();
export type ReaderSettings = z.infer<typeof readerSettingsSchema>;
export const settingsSchema = z
  .object({
    appearance: z.enum(["dark", "light", "oled"]),
    reader: readerSettingsSchema,
    allowedRatings: z.array(z.enum(ratings)).max(4),
    languages: z.array(z.enum(["en", "ja", "ko", "zh"])).max(4),
    blockedGenres: z.array(z.string().max(80)).max(50),
    enabledSources: z.array(id).max(30),
  })
  .strict();
export type AppSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: AppSettings = {
  appearance: "dark",
  reader: {
    mode: "vertical",
    width: 800,
    gap: 0,
    background: "black",
    preload: 1,
    autoNext: false,
    saveProgress: true,
  },
  allowedRatings: ["safe", "suggestive"],
  languages: ["en"],
  blockedGenres: [],
  enabledSources: ["demo", "kitsu"],
};
export const librarySchema = z
  .object({
    id,
    series: seriesSchema,
    status: z.enum(readingStatuses),
    favorite: z.boolean(),
    addedAt: z.number().nonnegative(),
    updatedAt: z.number().nonnegative(),
  })
  .strict();
export type LibraryEntry = z.infer<typeof librarySchema>;
export const progressSchema = z
  .object({
    id,
    canonicalId: id,
    sourceId: id,
    chapterId: id,
    chapterNumber: z.number().nullable(),
    chapterTitle: text,
    series: seriesSchema,
    scrollY: z.number().min(0).max(10000000),
    pageIndex: z.number().int().min(0).max(100000),
    pageOffset: z.number().min(0).max(1),
    fraction: z.number().min(0).max(1),
    completed: z.boolean(),
    mode: z.enum(["vertical", "paged", "rtl"]),
    timestamp: z.number().nonnegative(),
  })
  .strict();
export type ReadingProgress = z.infer<typeof progressSchema>;
export type HistoryEntry = ReadingProgress;
export const backupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.string().max(50),
    library: z.array(librarySchema).max(10000),
    history: z.array(progressSchema).max(1000),
    progress: z.array(progressSchema).max(20000),
    settings: settingsSchema,
  })
  .strict()
  .superRefine((v, c) => {
    for (const key of ["library", "history", "progress"] as const) {
      if (new Set(v[key].map((x) => x.id)).size !== v[key].length)
        c.addIssue({ code: "custom", message: `Duplicate ${key} identifiers` });
    }
    for (const e of v.library)
      if (e.id !== e.series.canonicalId)
        c.addIssue({ code: "custom", message: "Library key mismatch" });
    for (const p of [...v.progress, ...v.history])
      if (
        p.id !== progressKey(p.canonicalId, p.sourceId, p.chapterId) ||
        p.canonicalId !== p.series.canonicalId ||
        !p.series.sources.some((s) => s.sourceId === p.sourceId)
      )
        c.addIssue({ code: "custom", message: "Progress key mismatch" });
  });
export type Backup = z.infer<typeof backupSchema>;
export const progressKey = (series: string, source: string, chapter: string) =>
  `${series}|${source}|${chapter}`;
export function visibleSeries(s: Series, settings: AppSettings) {
  return (
    settings.allowedRatings.includes(s.contentRating) &&
    settings.languages.includes(s.language as "en") &&
    !s.genres.some((g) => settings.blockedGenres.includes(g))
  );
}
export function latestProgress(items: ReadingProgress[], seriesId: string) {
  return items
    .filter((p) => p.canonicalId === seriesId)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}
