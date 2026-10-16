import type {
  AppSettings,
  Chapter,
  Page,
  Series,
  ContentRating,
} from "@/types";
export type Capability =
  | "search"
  | "popular"
  | "latest"
  | "genres"
  | "chapters"
  | "reader"
  | "content-ratings"
  | "offline-demo";
export interface Source {
  id: string;
  name: string;
  description: string;
  languages: string[];
  contentRatings: ContentRating[];
  capabilities: Capability[];
  website: string;
}
export interface SearchQuery {
  query?: string;
  page: number;
  genre?: string;
  format?: string;
  status?: string;
  rating?: string;
  language?: string;
  sort?: "popular" | "latest" | "new" | "title";
}
export interface SourcePage {
  items: Series[];
  hasNextPage: boolean;
  notice?: string;
}
export interface SourceContext {
  signal: AbortSignal;
  settings: AppSettings;
}
export interface MangaSource {
  info: Source;
  search(query: SearchQuery, ctx: SourceContext): Promise<SourcePage>;
  getPopular(page: number, ctx: SourceContext): Promise<SourcePage>;
  getLatest(page: number, ctx: SourceContext): Promise<SourcePage>;
  getSeries(id: string, ctx: SourceContext): Promise<Series>;
  getChapters(seriesId: string, ctx: SourceContext): Promise<Chapter[]>;
  getPages(chapterId: string, ctx: SourceContext): Promise<Page[]>;
}
export interface SourceHealth {
  state: "untested" | "checking" | "available" | "unavailable";
  checkedAt?: number;
  message?: string;
}
