"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Play,
  Sparkles,
} from "lucide-react";
import { useCatalog } from "../browse/use-catalog";
import { useApp } from "@/components/app-context";
import {
  Cover,
  Empty,
  ErrorBox,
  Loading,
  SeriesCard,
  Shelf,
} from "@/components/ui";
import { genres, visibleSeries } from "@/types";
import { readerHref, resumeHref, seriesHref } from "@/utils/links";
export function HomePage() {
  const { data, ready } = useApp();
  const catalog = useCatalog({ page: 1, sort: "popular" });
  const latest = useCatalog({ page: 1, sort: "latest" });
  const fresh = useCatalog({ page: 1, sort: "new" });
  const demo = useCatalog(
    { page: 1 },
    data.settings.enabledSources.includes("demo") ? "demo" : "all",
  );
  const hero = demo.items.find((s) => s.readable);
  const continuing = [...data.progress]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(
      (p, i, all) =>
        all.findIndex((x) => x.canonicalId === p.canonicalId) === i &&
        visibleSeries(p.series, data.settings),
    );
  const favoriteGenres = data.library.flatMap((e) => e.series.genres);
  const recommended = [...catalog.items]
    .sort(
      (a, b) =>
        b.genres.filter((g) => favoriteGenres.includes(g)).length -
        a.genres.filter((g) => favoriteGenres.includes(g)).length,
    )
    .slice(0, 6);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE TIME FOR A GOOD STORY</p>
          <h1>
            Discover your next chapter<span className="accent">.</span>
          </h1>
        </div>
        <Link
          className="round-link"
          href="/browse/"
          aria-label="Discover titles"
        >
          <ArrowUpRight />
        </Link>
      </div>
      {hero && (
        <div className="feature-grid">
          <article className="featured">
            <img
              src={hero.cover}
              alt="A lantern illuminates a rain-soaked city"
              className="feature-art"
            />
            <div className="feature-shade" />
            <div className="feature-content">
              <span className="pill">
                <Sparkles size={13} /> ORIGINAL DEMO
              </span>
              <h2>{hero.title}</h2>
              <p>
                A forgotten city. An unexpected light.
                <br />
                Some stories find you.
              </p>
              <div className="feature-actions">
                <Link
                  className="button primary"
                  href={readerHref(hero, `${hero.externalId}.1`)}
                >
                  <Play size={16} fill="currentColor" />
                  Start reading
                </Link>
                <Link className="button ghost" href={seriesHref(hero)}>
                  Details <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </article>
          <article className="reading-note">
            <BookOpen size={28} />
            <div>
              <p className="eyebrow">A SPACE OF YOUR OWN</p>
              <h2>
                One library.
                <br />
                Endless possibilities.
              </h2>
              <p>
                Keep your stories close and pick up exactly where you left off.
              </p>
            </div>
            <Link href="/library/">
              Open your library <ArrowUpRight size={18} />
            </Link>
          </article>
        </div>
      )}
      <Shelf title="Continue reading" href="/history/">
        {!ready ? (
          <Loading />
        ) : continuing.length ? (
          <div className="continue-grid">
            {continuing.slice(0, 3).map((p) => (
              <Link className="continue-card" key={p.id} href={resumeHref(p)}>
                <Cover series={p.series} />
                <div>
                  <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
                  <h3>{p.series.title}</h3>
                  <p>
                    Chapter {p.chapterNumber} · {Math.round(p.fraction * 100)}%
                  </p>
                  <div className="mini-progress">
                    <span style={{ width: `${p.fraction * 100}%` }} />
                  </div>
                </div>
                <Play size={20} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="continue-empty">
            <BookOpen size={24} />
            <div>
              <strong>Your next favorite is waiting.</strong>
              <p>Start a chapter and your reading progress will appear here.</p>
            </div>
            <Link href="/browse/" className="text-link">
              Explore <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </Shelf>
      <div className="genre-strip" aria-label="Explore genres">
        {genres.map((g, i) => (
          <Link key={g} href={`/browse/?genre=${encodeURIComponent(g)}`}>
            <span>{["✦", "↗", "☾", "◇", "♡", "⌕", "⌁", "☀"][i]}</span>
            {g}
          </Link>
        ))}
      </div>
      <Shelf
        title="Popular right now"
        eyebrow="FIND YOUR NEXT FAVORITE"
        href="/browse/?sort=popular"
      >
        {catalog.loading ? (
          <Loading />
        ) : (
          <>
            <div className="grid-cards">
              {catalog.items.slice(0, 6).map((s) => (
                <SeriesCard key={s.canonicalId} series={s} />
              ))}
            </div>
            {!catalog.items.length && (
              <Empty title="No titles to show">
                Try enabling a source or adjusting content settings.
              </Empty>
            )}
            {catalog.errors.map((e) => (
              <ErrorBox key={e} message={e} retry={catalog.retry} />
            ))}
          </>
        )}
      </Shelf>
      <Shelf title="Latest updates" href="/browse/?sort=latest">
        {latest.loading ? (
          <Loading />
        ) : (
          <div className="updates-grid">
            {latest.items.slice(0, 4).map((s) => (
              <Link
                key={s.canonicalId}
                href={seriesHref(s)}
                className="update-card"
              >
                <Cover series={s} />
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.readable ? "3 sample chapters" : "Metadata update"}</p>
                  <small>
                    {s.status} · {s.format}
                  </small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        )}
      </Shelf>
      <Shelf title="New releases" href="/browse/?sort=new">
        {fresh.loading ? (
          <Loading />
        ) : (
          <div className="horizontal-cards">
            {fresh.items.slice(0, 6).map((s) => (
              <SeriesCard series={s} key={s.canonicalId} />
            ))}
          </div>
        )}
      </Shelf>
      <Shelf
        title="Picked for your shelf"
        eyebrow={
          data.library.length
            ? "BASED ON YOUR LIBRARY GENRES"
            : "A FEW PLACES TO BEGIN"
        }
        href="/browse/"
      >
        <div className="grid-cards">
          {recommended.map((s) => (
            <SeriesCard key={s.canonicalId} series={s} />
          ))}
        </div>
      </Shelf>
      <Shelf
        title="Into the extraordinary"
        eyebrow="EXPLORE FANTASY"
        href="/browse/?genre=Fantasy"
      >
        <div className="horizontal-cards">
          {catalog.items
            .filter((s) => s.genres.includes("Fantasy"))
            .slice(0, 6)
            .map((s) => (
              <SeriesCard series={s} key={s.canonicalId} />
            ))}
        </div>
      </Shelf>
    </>
  );
}
