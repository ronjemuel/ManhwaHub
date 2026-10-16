import type { Series, ReadingProgress } from "@/types";
export const seriesHref = (s: Series) =>
  `/series/?source=${encodeURIComponent(s.sourceId)}&id=${encodeURIComponent(s.externalId)}`;
export const readerHref = (s: Series, chapter: string, extra = "") =>
  `/reader/?source=${encodeURIComponent(s.sourceId)}&id=${encodeURIComponent(s.externalId)}&chapter=${encodeURIComponent(chapter)}${extra}`;
export const resumeHref = (p: ReadingProgress) =>
  readerHref(
    {
      ...p.series,
      sourceId: p.sourceId,
      externalId:
        p.series.sources.find((x) => x.sourceId === p.sourceId)?.externalId ||
        p.series.externalId,
    },
    p.chapterId,
    `&resume=${encodeURIComponent(p.id)}`,
  );
export const dateLabel = (value: string | number | null) =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date unavailable";
