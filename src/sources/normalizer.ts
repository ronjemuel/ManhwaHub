import { seriesSchema, type Series, type Chapter } from "@/types";
export function normalizeSeries(input: unknown): Series {
  return seriesSchema.parse(input);
}
export function equivalentChapter(current: Chapter, candidates: Chapter[]) {
  if (current.number === null) return undefined;
  const matches = candidates.filter(
    (c) =>
      c.number === current.number &&
      c.volume === current.volume &&
      c.language === current.language,
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .slice(0, 10000);
}
