"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  Layers,
  Check,
  Eye,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { Button, ErrorBox, Loading, Modal, Field } from "@/components/ui";
import { registry } from "@/sources/registry";
import { equivalentChapter } from "@/sources/normalizer";
import {
  progressKey,
  visibleSeries,
  type Chapter,
  type Page,
  type Series,
  type ReadingProgress,
} from "@/types";
import { readerHref, seriesHref } from "@/utils/links";
import { ReaderSettingsForm } from "./reader-settings";
import { PageImage } from "./page-image";
interface Session {
  series: Series;
  chapters: Chapter[];
  chapter: Chapter;
  pages: Page[];
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function ReaderPage() {
  const params = useSearchParams();
  const source = params.get("source") || "demo",
    id = params.get("id") || "",
    chapter = params.get("chapter") || "";
  return (
    <ReaderView
      key={`${source}:${id}:${chapter}`}
      source={source}
      id={id}
      chapterId={chapter}
      transferPage={params.has("page") ? Number(params.get("page")) : null}
      transferOffset={
        params.has("offset") ? Number(params.get("offset")) : null
      }
    />
  );
}
function ReaderView({
  source,
  id,
  chapterId,
  transferPage,
  transferOffset,
}: {
  source: string;
  id: string;
  chapterId: string;
  transferPage: number | null;
  transferOffset: number | null;
}) {
  const router = useRouter();
  const app = useApp();
  const { data, ready, notify } = app;
  const appRef = useRef(app);
  appRef.current = app;
  const [session, setSession] = useState<Session>(),
    [recoverySeries, setRecoverySeries] = useState<Series>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [controls, setControls] = useState(true),
    [settingsOpen, setSettingsOpen] = useState(false),
    [sourceOpen, setSourceOpen] = useState(false),
    [pageIndex, setPageIndex] = useState(0),
    [fraction, setFraction] = useState(0),
    [restored, setRestored] = useState(false),
    [switching, setSwitching] = useState(false);
  const container = useRef<HTMLDivElement>(null),
    position = useRef({ pageIndex: 0, pageOffset: 0, scrollY: 0, fraction: 0 }),
    startTouch = useRef<number | null>(null),
    didRestore = useRef(false),
    saveFn = useRef<() => void>(() => {}),
    settings = data.settings.reader;
  const policy = JSON.stringify([
    data.settings.enabledSources,
    data.settings.allowedRatings,
    data.settings.languages,
    data.settings.blockedGenres,
  ]);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    setError("");
    setRestored(false);
    didRestore.current = false;
    registry
      .getSeries(source, id, data.settings)
      .then(async (series) => {
        if (alive) setRecoverySeries(series);
        const chapters = await registry.getChapters(source, id, data.settings);
        const chapter = chapters.find((c) => c.id === chapterId);
        if (!chapter)
          throw new Error(
            "This chapter is missing or unavailable. Open the series to choose another chapter.",
          );
        const pages = await registry.getPages(source, chapterId, data.settings);
        if (!pages.length)
          throw new Error("This chapter has no readable pages.");
        if (alive) setSession({ series, chapters, chapter, pages });
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [source, id, chapterId, ready, policy, retry]);
  const snapshot = useCallback(() => {
    if (!session || !didRestore.current) return;
    const mode = appRef.current.data.settings.reader.mode;
    if (mode === "vertical") {
      const elements = Array.from(
        container.current?.querySelectorAll<HTMLElement>("[data-page]") || [],
      );
      let index = 0,
        offset = 0;
      for (let i = 0; i < elements.length; i++) {
        const r = elements[i].getBoundingClientRect();
        if (r.top <= 90) {
          index = i;
          offset = clamp((90 - r.top) / r.height);
        }
      }
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const f = clamp(window.scrollY / max);
      position.current = {
        pageIndex: index,
        pageOffset: offset,
        scrollY: window.scrollY,
        fraction: f,
      };
      setPageIndex(index);
      setFraction(f);
    } else {
      const f =
        session.pages.length === 1 ? 1 : pageIndex / (session.pages.length - 1);
      position.current = { pageIndex, pageOffset: 0, scrollY: 0, fraction: f };
      setFraction(f);
    }
  }, [session, pageIndex]);
  const persist = useCallback(() => {
    if (
      !session ||
      !didRestore.current ||
      !appRef.current.data.settings.reader.saveProgress
    )
      return;
    const p = position.current;
    const key = progressKey(session.series.canonicalId, source, chapterId);
    const record: ReadingProgress = {
      id: key,
      canonicalId: session.series.canonicalId,
      sourceId: source,
      chapterId,
      chapterNumber: session.chapter.number,
      chapterTitle: session.chapter.title,
      series: session.series,
      ...p,
      completed: p.fraction >= 0.97,
      mode: appRef.current.data.settings.reader.mode,
      timestamp: Date.now(),
    };
    void appRef.current.saveProgress(record).catch(() => {});
  }, [session, source, chapterId]);
  saveFn.current = persist;
  useEffect(() => {
    if (!session || loading || didRestore.current) return;
    const saved = appRef.current.data.progress.find(
      (p) =>
        p.id === progressKey(session.series.canonicalId, source, chapterId),
    );
    const index = Math.min(
      session.pages.length - 1,
      Math.max(
        0,
        transferPage !== null && Number.isFinite(transferPage)
          ? Math.floor(transferPage)
          : saved?.pageIndex || 0,
      ),
    );
    const offset =
      transferOffset !== null && Number.isFinite(transferOffset)
        ? clamp(transferOffset)
        : saved?.pageOffset || 0;
    setPageIndex(index);
    position.current = {
      pageIndex: index,
      pageOffset: offset,
      scrollY: saved?.scrollY || 0,
      fraction: saved?.fraction || 0,
    };
    const t = setTimeout(() => {
      if (appRef.current.data.settings.reader.mode === "vertical") {
        const el = container.current?.querySelector<HTMLElement>(
          `[data-page="${index}"]`,
        );
        if (el) {
          window.scrollTo({
            top: Math.max(
              0,
              el.getBoundingClientRect().top +
                window.scrollY +
                offset * el.getBoundingClientRect().height -
                90,
            ),
            behavior: "instant",
          });
        }
      } else window.scrollTo(0, 0);
      didRestore.current = true;
      setRestored(true);
      setFraction(saved?.fraction || 0);
    }, 120);
    return () => clearTimeout(t);
  }, [session, loading]);
  useEffect(() => {
    if (!restored) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      snapshot();
      clearTimeout(timer);
      timer = setTimeout(() => saveFn.current(), 450);
    };
    const flush = () => {
      snapshot();
      saveFn.current();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      saveFn.current();
    };
  }, [restored, snapshot]);
  useEffect(() => {
    if (!session || !settings.preload) return;
    const images: HTMLImageElement[] = [];
    for (let n = 1; n <= settings.preload; n++) {
      const p = session.pages[pageIndex + n];
      if (p) {
        const i = new Image();
        i.src = p.url;
        images.push(i);
      }
    }
    return () => {
      images.forEach((i) => {
        i.onload = null;
      });
    };
  }, [session, pageIndex, settings.preload]);
  const move = (delta: number) => {
    if (!session) return;
    setPageIndex((p) =>
      Math.min(session.pages.length - 1, Math.max(0, p + delta)),
    );
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        settingsOpen ||
        sourceOpen ||
        (e.target as HTMLElement)?.closest("input,select,textarea")
      )
        return;
      if (e.key === "Escape") {
        setControls(true);
        return;
      }
      if (settings.mode === "vertical") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(settings.mode === "rtl" ? -1 : 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(settings.mode === "rtl" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [session, settings.mode, settingsOpen, sourceOpen]);
  const previousLayout = useRef({
    mode: settings.mode,
    width: settings.width,
    gap: settings.gap,
  });
  useEffect(() => {
    const old = previousLayout.current;
    previousLayout.current = {
      mode: settings.mode,
      width: settings.width,
      gap: settings.gap,
    };
    if (
      !didRestore.current ||
      !session ||
      (old.mode === settings.mode &&
        old.width === settings.width &&
        old.gap === settings.gap)
    )
      return;
    const saved = { ...position.current };
    const t = setTimeout(() => {
      if (settings.mode === "vertical") {
        const el = container.current?.querySelector<HTMLElement>(
          `[data-page="${saved.pageIndex}"]`,
        );
        if (el)
          window.scrollTo({
            top: Math.max(
              0,
              el.getBoundingClientRect().top +
                window.scrollY +
                saved.pageOffset * el.getBoundingClientRect().height -
                90,
            ),
            behavior: "instant",
          });
      } else {
        window.scrollTo(0, 0);
        setPageIndex(saved.pageIndex);
      }
      snapshot();
    }, 60);
    return () => clearTimeout(t);
  }, [settings.mode, settings.width, settings.gap, session]);
  const current = session?.chapters.findIndex((c) => c.id === chapterId) ?? -1;
  const previous = session?.chapters[current - 1],
    next = session?.chapters[current + 1];
  const go = (chapter: Chapter) => {
    persist();
    router.push(readerHref(session!.series, chapter.id));
  };
  useEffect(() => {
    if (
      !restored ||
      !settings.autoNext ||
      fraction < 0.97 ||
      !next ||
      settingsOpen ||
      sourceOpen
    )
      return;
    const timer = setTimeout(() => go(next), 2200);
    return () => clearTimeout(timer);
  }, [
    fraction,
    restored,
    settings.autoNext,
    next?.id,
    settingsOpen,
    sourceOpen,
  ]);
  async function switchSource(target: string) {
    if (!session || target === source) return;
    setSwitching(true);
    try {
      const mapping = session.series.sources.find((s) => s.sourceId === target);
      if (!mapping) throw new Error("No mapped source is available.");
      const chapters = await registry.getChapters(
        target,
        mapping.externalId,
        data.settings,
      );
      const eq = equivalentChapter(session.chapter, chapters);
      persist();
      const s = {
        ...session.series,
        sourceId: target,
        externalId: mapping.externalId,
      };
      if (eq) {
        notify("Equivalent chapter found. Source changed.");
        router.push(
          readerHref(
            s,
            eq.id,
            `&page=${position.current.pageIndex}&offset=${position.current.pageOffset}`,
          ),
        );
      } else {
        notify(
          "No exact chapter match. Please choose a chapter from the new source.",
        );
        router.push(seriesHref(s));
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not switch source.");
    } finally {
      setSwitching(false);
    }
  }
  const knownSeries =
    recoverySeries ||
    data.progress.find(
      (p) => p.sourceId === source && p.series.externalId === id,
    )?.series ||
    data.library.find((e) =>
      e.series.sources.some(
        (s) => s.sourceId === source && s.externalId === id,
      ),
    )?.series;
  const alternatives =
    knownSeries && visibleSeries(knownSeries, data.settings)
      ? knownSeries.sources.filter(
          (s) =>
            s.sourceId !== source &&
            data.settings.enabledSources.includes(s.sourceId),
        )
      : [];
  if (loading)
    return (
      <div className="reader-loading">
        <Loading />
      </div>
    );
  if (error || !session)
    return (
      <div className="reader-error">
        <Link
          className="button"
          href={`/series/?source=${source}&id=${encodeURIComponent(id)}`}
        >
          <ArrowLeft size={17} />
          Back to series
        </Link>
        <ErrorBox
          message={error || "Chapter not found."}
          retry={() => setRetry((n) => n + 1)}
        />
        <p>
          ManhwaHub never switches sources automatically. Choose an available
          edition below, or retry this source.
        </p>
        {alternatives.map((mapping) => (
          <Link
            className="button"
            key={mapping.sourceId}
            href={seriesHref({
              ...knownSeries!,
              sourceId: mapping.sourceId,
              externalId: mapping.externalId,
            })}
          >
            Open{" "}
            {registry.list().find((s) => s.id === mapping.sourceId)?.name ||
              mapping.sourceId}
          </Link>
        ))}
        <Link href="/sources/" className="button">
          Manage sources
        </Link>
      </div>
    );
  return (
    <div
      className={`reader reader-bg-${settings.background} ${controls ? "controls-visible" : "controls-hidden"}`}
    >
      <header className="reader-top">
        <Link
          className="icon-button"
          href={seriesHref(session.series)}
          aria-label="Back to series"
          onClick={persist}
        >
          <ArrowLeft />
        </Link>
        <div className="reader-title">
          <strong>{session.series.title}</strong>
          <small>
            Chapter {session.chapter.number} · {session.chapter.title}
          </small>
        </div>
        <button
          className="icon-button"
          aria-label="Change reader source"
          onClick={() => setSourceOpen(true)}
        >
          <Layers size={20} />
        </button>
        <button
          className="icon-button"
          aria-label="Reader settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={20} />
        </button>
      </header>
      {!controls && (
        <button
          className="reveal-controls"
          aria-label="Show reader controls"
          onClick={() => setControls(true)}
        >
          <Eye size={19} />
        </button>
      )}
      <div
        ref={container}
        className={`reader-pages ${settings.mode !== "vertical" ? "paged" : ""}`}
        style={{ maxWidth: settings.width, gap: settings.gap }}
        onClick={(e) => {
          if (
            !(e.target as HTMLElement).closest("button,a,input,select,dialog")
          )
            setControls((v) => !v);
        }}
        onTouchStart={(e) => {
          startTouch.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (settings.mode === "vertical" || startTouch.current === null)
            return;
          const delta = e.changedTouches[0].clientX - startTouch.current;
          if (Math.abs(delta) > 60)
            move((delta < 0 ? 1 : -1) * (settings.mode === "rtl" ? -1 : 1));
          startTouch.current = null;
        }}
      >
        {settings.mode === "vertical" ? (
          session.pages.map((p, i) => (
            <div data-page={i} key={p.id}>
              <PageImage page={p} eager={i <= pageIndex + settings.preload} />
            </div>
          ))
        ) : (
          <div data-page={pageIndex}>
            <PageImage
              key={session.pages[pageIndex].id}
              page={session.pages[pageIndex]}
              eager
            />
          </div>
        )}
      </div>
      {settings.mode !== "vertical" && (
        <div className="page-controls">
          <Button
            aria-label={settings.mode === "rtl" ? "Next page" : "Previous page"}
            disabled={
              settings.mode === "rtl"
                ? pageIndex === session.pages.length - 1
                : pageIndex === 0
            }
            onClick={() => move(settings.mode === "rtl" ? 1 : -1)}
          >
            <ChevronLeft />
          </Button>
          <span>
            Page {pageIndex + 1} / {session.pages.length}
            {settings.mode === "rtl" ? " · Right to left" : ""}
          </span>
          <Button
            aria-label={settings.mode === "rtl" ? "Previous page" : "Next page"}
            disabled={
              settings.mode === "rtl"
                ? pageIndex === 0
                : pageIndex === session.pages.length - 1
            }
            onClick={() => move(settings.mode === "rtl" ? -1 : 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
      {(settings.mode === "vertical" ||
        pageIndex === session.pages.length - 1) && (
        <div className="chapter-end">
          <Check size={26} />
          <p className="eyebrow">CHAPTER {session.chapter.number}</p>
          <h2>You’ve reached the end.</h2>
          <p>
            {next
              ? "Another chapter is waiting."
              : "You’re all caught up with this series."}
          </p>
          <div>
            <Button
              disabled={!previous}
              onClick={() => previous && go(previous)}
            >
              <ChevronLeft size={18} />
              Previous chapter
            </Button>
            {next ? (
              <Button className="primary" onClick={() => go(next)}>
                Next chapter
                <ChevronRight size={18} />
              </Button>
            ) : (
              <Link
                className="button primary"
                href={seriesHref(session.series)}
              >
                Back to series
              </Link>
            )}
          </div>
          {settings.autoNext && next && fraction >= 0.97 && (
            <p role="status">
              Opening the next chapter…{" "}
              <button
                className="text-link"
                onClick={() =>
                  app.setReader({ autoNext: false }).catch(() => {})
                }
              >
                Cancel auto-next
              </button>
            </p>
          )}
        </div>
      )}
      <div className="reader-bottom">
        <button
          className="icon-button"
          aria-label="Previous chapter"
          disabled={!previous}
          onClick={() => previous && go(previous)}
        >
          <ChevronLeft />
        </button>
        <select
          aria-label="Select chapter"
          value={chapterId}
          onChange={(e) => {
            const c = session.chapters.find((c) => c.id === e.target.value);
            if (c) go(c);
          }}
        >
          {session.chapters.map((c) => (
            <option value={c.id} key={c.id}>
              Chapter {c.number} · {c.title}
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label="Next chapter"
          disabled={!next}
          onClick={() => next && go(next)}
        >
          <ChevronRight />
        </button>
        <span className="reader-percentage">{Math.round(fraction * 100)}%</span>
      </div>
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Reader settings"
      >
        <ReaderSettingsForm />
      </Modal>
      <Modal
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        title="Choose a source"
      >
        <p>
          Only explicitly mapped editions appear here. Position is transferred
          when chapter number, volume and language match exactly.
        </p>
        <Field label="Source">
          <select
            disabled={switching}
            value={source}
            onChange={(e) => void switchSource(e.target.value)}
          >
            {session.series.sources.map((s) => (
              <option
                key={s.sourceId}
                value={s.sourceId}
                disabled={!data.settings.enabledSources.includes(s.sourceId)}
              >
                {registry.list().find((x) => x.id === s.sourceId)?.name}
                {!data.settings.enabledSources.includes(s.sourceId)
                  ? " (disabled)"
                  : ""}
              </option>
            ))}
          </select>
        </Field>
        <Link className="text-link" href="/sources/">
          Manage enabled sources
        </Link>
      </Modal>
    </div>
  );
}
