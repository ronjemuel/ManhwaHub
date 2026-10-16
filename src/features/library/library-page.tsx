"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Empty, Loading, SeriesCard } from "@/components/ui";
import { readingStatuses, latestProgress, visibleSeries } from "@/types";
export function LibraryPage() {
  const { data, ready } = useApp();
  const [tab, setTab] = useState("All"),
    [query, setQuery] = useState("");
  const all = data.library.filter((e) =>
    visibleSeries(e.series, data.settings),
  );
  const items = all
    .filter(
      (e) =>
        (tab === "All" ||
          (tab === "Favorites" && e.favorite) ||
          e.status === tab) &&
        e.series.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">STORIES WORTH KEEPING</p>
          <h1>
            Your library<span className="accent">.</span>
          </h1>
          <p>
            {all.length} {all.length === 1 ? "title" : "titles"}, all yours.
          </p>
        </div>
        <Link className="button" href="/browse/">
          <Plus size={18} />
          Find stories
        </Link>
      </div>
      <input
        className="library-search"
        aria-label="Search library"
        placeholder="Search your library…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="tabs" role="tablist" aria-label="Library status">
        {["All", ...readingStatuses, "Favorites"].map((s) => (
          <button
            role="tab"
            aria-selected={tab === s}
            className={tab === s ? "active" : ""}
            key={s}
            onClick={() => setTab(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {!ready ? (
        <Loading />
      ) : items.length ? (
        <div className="grid-cards browse-grid">
          {items.map((e) => (
            <div key={e.id}>
              <SeriesCard
                series={e.series}
                progress={latestProgress(data.progress, e.id)}
              />
              <p className="library-card-meta">
                {e.favorite ? "♥ · " : ""}
                {e.status}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={
            query
              ? "No matching titles"
              : tab === "All"
                ? "Make room for your next favorite"
                : `Nothing in ${tab.toLowerCase()} yet`
          }
        >
          <p>Add a title from its series page to keep it here.</p>
          <Link href="/browse/" className="button primary">
            Discover stories
          </Link>
        </Empty>
      )}
      {data.library.length > all.length && (
        <p className="provider-note">
          Some saved titles are hidden by your content preferences.
        </p>
      )}
    </>
  );
}
