"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  Heart,
  Play,
  Search,
  ExternalLink,
} from "lucide-react";
import { registry } from "@/sources/registry";
import { useApp } from "@/components/app-context";
import {
  Button,
  Cover,
  Empty,
  ErrorBox,
  Field,
  Loading,
} from "@/components/ui";
import {
  latestProgress,
  readingStatuses,
  type Chapter,
  type Series,
} from "@/types";
import { dateLabel, readerHref, resumeHref } from "@/utils/links";
export function SeriesPage() {
  const params = useSearchParams(),
    { data, ready, putLibrary, removeLibrary, notify } = useApp();
  const source = params.get("source") || "demo",
    id = params.get("id") || "";
  const [selected, setSelected] = useState(source),
    [series, setSeries] = useState<Series>(),
    [chapters, setChapters] = useState<Chapter[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [newest, setNewest] = useState(false),
    [retry, setRetry] = useState(0);
  const policy = JSON.stringify([
    data.settings.enabledSources,
    data.settings.allowedRatings,
    data.settings.languages,
    data.settings.blockedGenres,
  ]);
  useEffect(() => {
    setSelected(source);
  }, [source, id]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    setError("");
    const external =
      series?.sources.find((s) => s.sourceId === selected)?.externalId || id;
    registry
      .getSeries(selected, external, data.settings)
      .then(async (s) => {
        const c = await registry.getChapters(selected, external, data.settings);
        if (active) {
          setSeries(s);
          setChapters(c);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, id, ready, policy, retry]);
  if (loading) return <Loading />;
  if (error || !series)
    return (
      <>
        <Link className="back-link" href="/browse/">
          <ArrowLeft size={17} />
          Browse
        </Link>
        <ErrorBox
          message={error || "Series not found."}
          retry={() => setRetry((n) => n + 1)}
        />
        <Link className="button" href="/sources/">
          Manage sources
        </Link>
      </>
    );
  const entry = data.library.find((e) => e.id === series.canonicalId),
    progress = latestProgress(data.progress, series.canonicalId);
  const sorted = chapters
    .filter((c) =>
      `${c.number} ${c.title}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (newest ? -1 : 1) * ((a.number || 0) - (b.number || 0)));
  const act = (p: Promise<void>) => {
    p.catch(() => {});
  };
  return (
    <>
      <Link href="/browse/" className="back-link">
        <ArrowLeft size={17} />
        Back to browse
      </Link>
      <section className="series-detail">
        <Cover series={series} className="detail-cover" />
        <div className="series-info">
          <div className="flex flex-wrap gap-2">
            <span className="pill">{series.format}</span>
            <span className={`pill rating-${series.contentRating}`}>
              {series.contentRating}
            </span>
            <span className="pill">{series.status}</span>
          </div>
          <h1>{series.title}</h1>
          <p className="alt-title">
            {series.alternativeTitles.join(" · ") || "No alternative titles"}
          </p>
          <div className="series-facts">
            <span>{series.author}</span>
            {series.rating !== null && (
              <span>★ {series.rating.toFixed(1)} / 10</span>
            )}
            <span>{series.chapterCount ?? "Unknown"} chapters</span>
          </div>
          <p className="description">{series.description}</p>
          <div className="chips">
            {series.genres.map((g) => (
              <Link href={`/browse/?genre=${encodeURIComponent(g)}`} key={g}>
                {g}
              </Link>
            ))}
          </div>
          <div className="series-actions">
            {series.readable &&
              chapters[0] &&
              (progress ? (
                <Link className="button primary" href={resumeHref(progress)}>
                  <Play size={16} />
                  Continue chapter {progress.chapterNumber}
                </Link>
              ) : (
                <Link
                  className="button primary"
                  href={readerHref(series, chapters[0].id)}
                >
                  <Play size={16} />
                  Read first chapter
                </Link>
              ))}
            <Button
              onClick={() =>
                act(
                  entry
                    ? removeLibrary(series.canonicalId)
                    : putLibrary(series),
                )
              }
            >
              {entry ? <Check size={18} /> : <Bookmark size={18} />}{" "}
              {entry ? "In library" : "Add to library"}
            </Button>
            <Button
              className={entry?.favorite ? "favorite" : ""}
              aria-label={entry?.favorite ? "Remove favorite" : "Favorite"}
              onClick={() =>
                act(putLibrary(series, { favorite: !entry?.favorite }))
              }
            >
              <Heart
                size={18}
                fill={entry?.favorite ? "currentColor" : "none"}
              />
            </Button>
            {series.url && (
              <a
                className="button"
                href={series.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={17} />
                View on Kitsu
              </a>
            )}
          </div>
          <div className="detail-selects">
            <Field label="Reading status">
              <select
                value={entry?.status || ""}
                onChange={(e) =>
                  act(
                    putLibrary(series, {
                      status: e.target
                        .value as (typeof readingStatuses)[number],
                    }),
                  )
                }
              >
                <option value="" disabled>
                  Choose status
                </option>
                {readingStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Available sources">
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  notify("Source changed. Chapters updated.");
                }}
              >
                {series.sources.map((s) => (
                  <option
                    key={s.sourceId}
                    value={s.sourceId}
                    disabled={
                      !data.settings.enabledSources.includes(s.sourceId)
                    }
                  >
                    {registry.list().find((p) => p.id === s.sourceId)?.name ||
                      s.sourceId}
                    {!data.settings.enabledSources.includes(s.sourceId)
                      ? " (disabled)"
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="small muted">
            Artist: {series.artist} · Metadata language: English
          </p>
          {series.ratingNote && (
            <p className="small muted">{series.ratingNote}</p>
          )}
        </div>
      </section>
      <section className="chapter-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE STORY SO FAR</p>
            <h2>
              Chapters <span className="count">{chapters.length}</span>
            </h2>
          </div>
          <select
            aria-label="Chapter order"
            value={newest ? "newest" : "oldest"}
            onChange={(e) => setNewest(e.target.value === "newest")}
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
        <label className="chapter-search">
          <Search size={18} />
          <input
            placeholder="Find a chapter…"
            aria-label="Search chapters"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {sorted.length ? (
          <div className="chapter-list">
            {sorted.map((c) => {
              const saved = data.progress.find(
                (p) => p.sourceId === selected && p.chapterId === c.id,
              );
              const last =
                progress?.sourceId === selected && progress.chapterId === c.id;
              return (
                <Link
                  key={c.id}
                  href={readerHref(series, c.id)}
                  className={last ? "last-read" : ""}
                >
                  <span className="chapter-number">
                    {saved?.completed ? (
                      <Check size={18} />
                    ) : (
                      String(c.number).padStart(2, "0")
                    )}
                  </span>
                  <div>
                    <strong>{c.title}</strong>
                    <small>
                      {last ? "Last read · " : ""}
                      {saved?.completed
                        ? "Read"
                        : saved
                          ? "In progress"
                          : "Unread"}
                    </small>
                  </div>
                  <time>{dateLabel(c.releasedAt)}</time>
                  <BookOpen size={17} />
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty
            title={
              chapters.length
                ? "No matching chapters"
                : series.readable
                  ? "No chapters available"
                  : "Metadata source only"
            }
          >
            {chapters.length
              ? "Try another chapter number or title."
              : "This source does not provide chapter images. Your library can still track this title."}
          </Empty>
        )}
      </section>
    </>
  );
}
