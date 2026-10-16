import { createDemoSource } from "./mock";
import { kitsuSource } from "./kitsu";
import type {
  MangaSource,
  SearchQuery,
  SourceContext,
  SourceHealth,
  SourcePage,
} from "./types";
import {
  defaultSettings,
  seriesSchema,
  visibleSeries,
  type AppSettings,
  type Series,
} from "@/types";
import { readCache, putCache } from "@/storage/indexed-db";
import { z } from "zod";
const cachedPage = z.object({
  items: z.array(seriesSchema),
  hasNextPage: z.boolean(),
  notice: z.string().optional(),
});
export class SourceRegistry {
  private providers: Map<string, MangaSource>;
  private health = new Map<string, SourceHealth>();
  private pending = new Map<string, Promise<unknown>>();
  constructor(providers: MangaSource[]) {
    this.providers = new Map(providers.map((p) => [p.info.id, p]));
  }
  list() {
    return [...this.providers.values()].map((p) => p.info);
  }
  status(id: string) {
    return this.health.get(id) || { state: "untested" as const };
  }
  private source(id: string, settings: AppSettings) {
    const p = this.providers.get(id);
    if (!p) throw new Error("This source is not installed.");
    if (!settings.enabledSources.includes(id))
      throw new Error(
        `${p.info.name} is disabled. Enable it in Sources to continue.`,
      );
    return p;
  }
  async call<T>(
    id: string,
    settings: AppSettings,
    fn: (s: MangaSource, ctx: SourceContext) => Promise<T>,
  ): Promise<T> {
    const s = this.source(id, settings);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        fn(s, { signal: controller.signal, settings }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(
              new Error(
                `${s.info.name} took too long to respond. Please retry.`,
              ),
            );
          }, 12000);
        }),
      ]);
      this.health.set(id, {
        state: "available",
        checkedAt: Date.now(),
        message: "Last request succeeded",
      });
      return result;
    } catch (e) {
      this.health.set(id, {
        state: "unavailable",
        checkedAt: Date.now(),
        message: e instanceof Error ? e.message : "Source unavailable",
      });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  async search(query: SearchQuery, settings: AppSettings, sourceId = "all") {
    const sources = this.list().filter(
      (s) =>
        settings.enabledSources.includes(s.id) &&
        (sourceId === "all" || s.id === sourceId) &&
        s.capabilities.includes("search") &&
        s.languages.some((l) => settings.languages.includes(l as "en")),
    );
    const errors: string[] = [],
      notices: string[] = [];
    const replies = await Promise.all(
      sources.map(async (source) => {
        try {
          const key = `search:${source.id}:${JSON.stringify(query)}`;
          let page: SourcePage | undefined;
          const cached = cachedPage.safeParse(await readCache(key));
          if (cached.success) page = cached.data;
          if (!page) {
            let job = this.pending.get(key) as Promise<SourcePage> | undefined;
            if (!job) {
              job = this.call(source.id, settings, (s, c) =>
                s.search(query, c),
              );
              this.pending.set(key, job);
            }
            try {
              page = await job;
              await putCache(key, page);
            } finally {
              this.pending.delete(key);
            }
          }
          if (page.notice) notices.push(`${source.name}: ${page.notice}`);
          return page;
        } catch (e) {
          errors.push(
            `${source.name}: ${e instanceof Error ? e.message : "Unavailable"}`,
          );
          return { items: [], hasNextPage: false };
        }
      }),
    );
    const seen = new Set<string>();
    const items = replies
      .flatMap((p) => p.items)
      .filter(
        (s) =>
          visibleSeries(s, settings) &&
          (!query.genre || s.genres.includes(query.genre)) &&
          (!query.format || s.format === query.format) &&
          (!query.status || s.status === query.status) &&
          (!query.rating || s.contentRating === query.rating) &&
          (!query.language || s.language === query.language),
      )
      .filter((s) => {
        if (seen.has(s.canonicalId)) return false;
        seen.add(s.canonicalId);
        return true;
      });
    if (query.sort === "title")
      items.sort((a, b) => a.title.localeCompare(b.title));
    if (query.sort === "latest")
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (query.sort === "new")
      items.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
    return {
      items,
      hasNextPage: replies.some((r) => r.hasNextPage),
      errors,
      notices,
      noSources: sources.length === 0,
    };
  }
  async getSeries(source: string, id: string, settings: AppSettings) {
    this.source(source, settings);
    const key = `series:${source}:${id}`;
    const cached = seriesSchema.safeParse(await readCache(key));
    let s: Series;
    if (cached.success) s = cached.data;
    else {
      s = await this.call(source, settings, (p, c) => p.getSeries(id, c));
      await putCache(key, s);
    }
    if (!visibleSeries(s, settings))
      throw new Error(
        "This title is hidden by your content or language settings. You can change these in More → Settings.",
      );
    return s;
  }
  getChapters(source: string, id: string, settings: AppSettings) {
    return this.call(source, settings, (p, c) => p.getChapters(id, c));
  }
  getPages(source: string, id: string, settings: AppSettings) {
    return this.call(source, settings, (p, c) => p.getPages(id, c));
  }
  async check(source: string, settings: AppSettings = defaultSettings) {
    this.health.set(source, { state: "checking" });
    try {
      await this.call(source, settings, (p, c) => p.getPopular(1, c));
    } catch {}
    return this.status(source);
  }
}
export const registry = new SourceRegistry([
  createDemoSource(),
  createDemoSource("demo-alt"),
  kitsuSource,
]);
