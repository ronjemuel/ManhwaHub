"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/components/app-context";
import {
  Button,
  Empty,
  ErrorBox,
  Field,
  Loading,
  SeriesCard,
} from "@/components/ui";
import { formats, statuses, genres, ratings } from "@/types";
import { registry } from "@/sources/registry";
import { useCatalog } from "./use-catalog";
import type { SearchQuery } from "@/sources/types";
export function BrowsePage() {
  const params = useSearchParams();
  const { data } = useApp();
  const [query, setQuery] = useState(params.get("q") || ""),
    [source, setSource] = useState("all"),
    [page, setPage] = useState(1),
    [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState({
    genre: params.get("genre") || "",
    format: "",
    status: "",
    rating: "",
    language: "",
    sort: (params.get("sort") || "popular") as SearchQuery["sort"],
  });
  useEffect(() => {
    setQuery(params.get("q") || "");
    setPage(1);
    setFilters((f) => ({
      ...f,
      genre: params.get("genre") || "",
      sort: (params.get("sort") || "popular") as SearchQuery["sort"],
    }));
  }, [params]);
  const result = useCatalog({ query, page, ...filters }, source);
  const set = (key: string, v: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: v }));
  };
  const clear = () => {
    setQuery("");
    setSource("all");
    setPage(1);
    setFilters({
      genre: "",
      format: "",
      status: "",
      rating: "",
      language: "",
      sort: "popular",
    });
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FIND SOMETHING YOU’LL LOVE</p>
          <h1>
            Browse stories<span className="accent">.</span>
          </h1>
        </div>
      </div>
      <div className="browse-search">
        <Search size={23} />
        <input
          aria-label="Search titles"
          placeholder="Search manga, manhwa, manhua…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
          >
            <X size={19} />
          </button>
        )}
      </div>
      <div className="browse-toolbar">
        <Field label="Source">
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All sources</option>
            {registry
              .list()
              .filter((s) => data.settings.enabledSources.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Sort by">
          <select
            value={filters.sort}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="popular">Popularity</option>
            <option value="latest">Latest updates</option>
            <option value="new">New releases</option>
            <option value="title">Title A–Z</option>
          </select>
        </Field>
        <Button
          className={expanded ? "selected" : ""}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <SlidersHorizontal size={17} />
          Filters
        </Button>
      </div>
      {expanded && (
        <div className="filter-panel">
          {[
            ["genre", "Genre", genres],
            ["format", "Format", formats],
            ["status", "Status", statuses],
            [
              "rating",
              "Content rating",
              ratings.filter((r) => data.settings.allowedRatings.includes(r)),
            ],
            ["language", "Language", data.settings.languages],
          ].map(([key, label, options]) => (
            <Field label={label as string} key={key as string}>
              <select
                value={filters[key as keyof typeof filters]}
                onChange={(e) => set(key as string, e.target.value)}
              >
                <option value="">
                  All{" "}
                  {key === "rating"
                    ? "allowed ratings"
                    : key === "status"
                      ? "statuses"
                      : String(label).toLowerCase() + "s"}
                </option>
                {(options as readonly string[]).map((v) => (
                  <option value={v} key={v}>
                    {v === "en" ? "English metadata" : v}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Button onClick={clear}>Reset filters</Button>
          <p className="muted">
            Content preferences also apply.{" "}
            <Link href="/settings/?tab=content">Manage allowed content</Link>
          </p>
        </div>
      )}
      <div className="chips">
        {["", ...genres].map((g) => (
          <button
            key={g}
            className={filters.genre === g ? "active" : ""}
            onClick={() => set("genre", g)}
          >
            {g || "All genres"}
          </button>
        ))}
      </div>
      <div className="results-meta">
        <span>
          {result.loading
            ? "Finding stories…"
            : `${result.items.length} title${result.items.length === 1 ? "" : "s"} on page ${page}`}
        </span>
        <span>Separate sources. One place.</span>
      </div>
      {result.errors.map((e) => (
        <ErrorBox key={e} message={e} retry={result.retry} />
      ))}
      {result.loading ? (
        <Loading />
      ) : result.items.length ? (
        <div className="grid-cards browse-grid">
          {result.items.map((s) => (
            <SeriesCard key={s.canonicalId} series={s} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            result.noSources
              ? "No compatible sources enabled"
              : "No stories match these filters"
          }
        >
          <p>
            {result.noSources
              ? "Enable a source and its supported language to discover titles."
              : "Try another title or adjust your filters. Unrated Kitsu titles are hidden by default."}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={clear}>Clear filters</Button>
            <Link className="button" href="/sources/">
              Manage sources
            </Link>
          </div>
        </Empty>
      )}
      <div className="pagination">
        <Button
          disabled={page === 1 || result.loading}
          onClick={() => {
            setPage((p) => p - 1);
            window.scrollTo(0, 0);
          }}
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          disabled={!result.hasNextPage || result.loading}
          onClick={() => {
            setPage((p) => p + 1);
            window.scrollTo(0, 0);
          }}
        >
          Next page
        </Button>
      </div>
      {result.notices.map((n) => (
        <p className="provider-note" key={n}>
          {n}
        </p>
      ))}
    </>
  );
}
