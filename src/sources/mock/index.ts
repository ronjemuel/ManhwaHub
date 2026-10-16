import type { MangaSource, SearchQuery } from "../types";
import type { Series } from "@/types";
import { demoSeries, artById } from "./data";
export function createDemoSource(sourceId = "demo"): MangaSource {
  const alt = sourceId === "demo-alt";
  const series = (s: Series) => ({ ...s, sourceId });
  const list = async (q: SearchQuery) => {
    let rows = demoSeries.filter(
      (s) =>
        (!q.query ||
          `${s.title} ${s.description}`
            .toLowerCase()
            .includes(q.query.toLowerCase())) &&
        (!q.genre || s.genres.includes(q.genre)) &&
        (!q.format || s.format === q.format) &&
        (!q.status || s.status === q.status) &&
        (!q.rating || s.contentRating === q.rating) &&
        (!q.language || s.language === q.language),
    );
    if (q.sort === "title") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (q.sort === "latest")
      rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (q.sort === "new")
      rows.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
    return {
      items: rows.slice((q.page - 1) * 18, q.page * 18).map(series),
      hasNextPage: rows.length > q.page * 18,
    };
  };
  return {
    info: {
      id: sourceId,
      name: alt ? "Demo · alternate edition" : "ManhwaHub Originals",
      description: alt
        ? "A second local adapter with curated chapter mappings. Enable to try source switching."
        : "Original illustrated sample chapters. Fully readable, with optional offline storage.",
      languages: ["en"],
      contentRatings: ["safe", "suggestive", "mature", "explicit"],
      capabilities: [
        "search",
        "popular",
        "latest",
        "genres",
        "chapters",
        "reader",
        "content-ratings",
        "offline-demo",
      ],
      website: "",
    },
    search: list,
    getPopular: (page) => list({ page, sort: "popular" }),
    getLatest: (page) => list({ page, sort: "latest" }),
    async getSeries(id) {
      const s = demoSeries.find((s) => s.externalId === id);
      if (!s) throw new Error("This series is not in the demo catalog.");
      return series(s);
    },
    async getChapters(id) {
      const s = demoSeries.find((s) => s.externalId === id);
      if (!s) throw new Error("Series not found.");
      if (!s.readable) return [];
      return [
        "A light in the distance",
        "Beyond the familiar",
        "A new beginning",
      ].map((title, i) => ({
        id: `${id}.${i + 1}`,
        seriesId: id,
        sourceId,
        number: i + 1,
        volume: "1",
        title,
        language: "en",
        releasedAt: `2026-09-${16 + i}`,
      }));
    },
    async getPages(chapter) {
      const match = /^([a-z-]+)\.([1-3])$/.exec(chapter);
      if (!match || !artById[match[1]])
        throw new Error(
          "This chapter could not be found. Return to the series and choose a chapter.",
        );
      const art = artById[match[1]],
        n = match[2];
      return [
        {
          id: `${chapter}-intro`,
          url: `/demo/${art}-${n}-intro.svg`,
          width: 900,
          height: 1400,
          alt: `Chapter ${n}: original story opening`,
        },
        {
          id: `${chapter}-art`,
          url: `/demo/${art}.webp`,
          width: 1024,
          height: 1536,
          alt: `Original illustrated ${art} comic page`,
        },
        {
          id: `${chapter}-end`,
          url: `/demo/${art}-${n}-end.svg`,
          width: 900,
          height: 1200,
          alt: `Chapter ${n}: original story conclusion`,
        },
      ];
    },
  };
}
