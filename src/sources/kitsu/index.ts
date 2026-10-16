import { z } from "zod";
import type { MangaSource, SearchQuery, SourceContext } from "../types";
import { normalizeSeries, plainText } from "../normalizer";
import type { Series } from "@/types";
const stringOrNull = z.string().nullable().optional();
const resource = z.object({
  id: z.string().regex(/^\d+$/),
  type: z.string(),
  attributes: z.object({
    canonicalTitle: z.string(),
    titles: z.record(stringOrNull).optional(),
    synopsis: stringOrNull,
    description: stringOrNull,
    subtype: stringOrNull,
    status: stringOrNull,
    ageRating: stringOrNull,
    averageRating: stringOrNull,
    chapterCount: z.number().nullable().optional(),
    updatedAt: stringOrNull,
    startDate: stringOrNull,
    posterImage: z
      .object({ small: stringOrNull, medium: stringOrNull })
      .nullable()
      .optional(),
  }),
  relationships: z
    .object({
      genres: z
        .object({
          data: z
            .array(z.object({ id: z.string(), type: z.string() }))
            .optional(),
        })
        .optional(),
    })
    .optional(),
});
const envelope = z.object({
  data: z.union([resource, z.array(resource)]),
  included: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        attributes: z.object({ name: z.string().optional() }),
      }),
    )
    .optional(),
  links: z.object({ next: stringOrNull }).optional(),
});
export function normalizeKitsu(
  raw: z.infer<typeof resource>,
  included: z.infer<typeof envelope>["included"] = [],
): Series {
  const a = raw.attributes;
  const status: Record<string, Series["status"]> = {
    current: "Ongoing",
    finished: "Completed",
    unreleased: "Hiatus",
    tba: "Hiatus",
    upcoming: "Hiatus",
    hiatus: "Hiatus",
    discontinued: "Cancelled",
  };
  const fm: Record<string, Series["format"]> = {
    manga: "Manga",
    manhwa: "Manhwa",
    manhua: "Manhua",
    oel: "Webtoon",
  };
  const contentRating =
    a.ageRating === "G"
      ? "safe"
      : a.ageRating === "PG"
        ? "suggestive"
        : a.ageRating === "R18"
          ? "explicit"
          : "mature";
  const genreIds = raw.relationships?.genres?.data?.map((g) => g.id) || [];
  return normalizeSeries({
    canonicalId: `kitsu:${raw.id}`,
    externalId: raw.id,
    sourceId: "kitsu",
    title: a.canonicalTitle,
    alternativeTitles: [
      ...new Set(
        Object.values(a.titles || {}).filter(
          (v): v is string => !!v && v !== a.canonicalTitle,
        ),
      ),
    ],
    description: plainText(
      a.synopsis || a.description || "No description supplied by Kitsu.",
    ),
    cover: a.posterImage?.medium || a.posterImage?.small || "",
    author: "Not supplied",
    artist: "Not supplied",
    genres: included
      .filter((g) => g.type === "genres" && genreIds.includes(g.id))
      .map((g) => g.attributes.name || "Other"),
    format: fm[a.subtype || ""] || "Manga",
    status: status[a.status || ""] || "Hiatus",
    contentRating,
    language: "en",
    sources: [{ sourceId: "kitsu", externalId: raw.id }],
    rating: a.averageRating ? Math.min(10, Number(a.averageRating) / 10) : null,
    chapterCount: a.chapterCount ?? null,
    updatedAt: a.updatedAt || "",
    releasedAt: a.startDate || "",
    url: `https://kitsu.app/manga/${raw.id}`,
    readable: false,
    ratingNote: !a.ageRating
      ? "Kitsu has not supplied an age rating. Hidden unless Mature is enabled."
      : `Kitsu age rating: ${a.ageRating}`,
  });
}
let nextRequestAt = 0;
async function get(path: string, ctx: SourceContext) {
  const delay = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Math.max(Date.now(), nextRequestAt) + 350;
  if (delay)
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, delay);
      ctx.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new Error("Request cancelled."));
        },
        { once: true },
      );
    });
  const res = await fetch(`https://kitsu.io/api/edge/${path}`, {
    signal: ctx.signal,
    headers: { Accept: "application/vnd.api+json" },
  });
  if (!res.ok)
    throw new Error(
      res.status === 429
        ? "Kitsu is limiting requests. Please wait a minute and retry."
        : `Kitsu is unavailable (HTTP ${res.status}). Try again later.`,
    );
  return envelope.parse(await res.json());
}
async function search(q: SearchQuery, ctx: SourceContext) {
  const p = new URLSearchParams({
    "page[limit]": "20",
    "page[offset]": String((q.page - 1) * 20),
    include: "genres",
    sort:
      q.sort === "latest"
        ? "-updatedAt"
        : q.sort === "new"
          ? "-startDate"
          : q.sort === "title"
            ? "canonicalTitle"
            : "popularityRank",
  });
  if (q.query) p.set("filter[text]", q.query);
  if (q.format && q.format !== "Webtoon")
    p.set("filter[subtype]", q.format.toLowerCase());
  const r = await get(`manga?${p}`, ctx);
  const data = Array.isArray(r.data) ? r.data : [r.data];
  return {
    items: data.map((v) => normalizeKitsu(v, r.included)),
    hasNextPage: !!r.links?.next,
    notice:
      "Metadata only. Unrated titles are treated as Mature. Genre, status, rating and language filters apply to each result page; a filtered page may be empty.",
  };
}
export const kitsuSource: MangaSource = {
  info: {
    id: "kitsu",
    name: "Kitsu",
    description:
      "Live manga, manhwa and manhua metadata. Does not supply readable chapter images. Unrated entries are treated as Mature.",
    languages: ["en"],
    contentRatings: ["safe", "suggestive", "mature", "explicit"],
    capabilities: ["search", "popular", "latest", "genres", "content-ratings"],
    website: "https://kitsu.app",
  },
  search,
  getPopular: (page, ctx) => search({ page, sort: "popular" }, ctx),
  getLatest: (page, ctx) => search({ page, sort: "latest" }, ctx),
  async getSeries(id, ctx) {
    if (!/^\d+$/.test(id)) throw new Error("Invalid Kitsu series identifier.");
    const r = await get(`manga/${id}?include=genres`, ctx);
    return normalizeKitsu(
      Array.isArray(r.data) ? r.data[0] : r.data,
      r.included,
    );
  },
  async getChapters() {
    return [];
  },
  async getPages() {
    throw new Error(
      "Kitsu provides metadata only. No chapter pages are available from this source.",
    );
  },
};
