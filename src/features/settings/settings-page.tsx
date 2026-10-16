"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, Upload, Trash2, HardDrive, Layers } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Button, Modal, Toggle } from "@/components/ui";
import { genres, ratings, type Backup } from "@/types";
import { ReaderSettingsForm } from "../reader/reader-settings";
import { repository } from "@/storage/indexed-db";
import { downloadBackup, parseBackup } from "@/storage/backup";
const tabs = ["Appearance", "Reader", "Content", "Sources", "Data"];
export function SettingsPage() {
  const params = useSearchParams(),
    { data, setSettings, reload, notify } = useApp();
  const [tab, setTab] = useState(
      tabs.find((t) => t.toLowerCase() === params.get("tab")) || "Appearance",
    ),
    [usage, setUsage] = useState("Calculating…"),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<"reset" | "history" | "cache" | "">(""),
    [pending, setPending] = useState<Backup>(),
    [importError, setImportError] = useState(""),
    [demoCached, setDemoCached] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<typeof data.settings>) =>
    setSettings({ ...data.settings, ...patch }).catch(() => {});
  async function measure() {
    const estimate = await navigator.storage?.estimate?.();
    setUsage(
      estimate?.usage !== undefined
        ? `${(estimate.usage / 1024 / 1024).toFixed(2)} MB used on this origin`
        : "Storage estimate unavailable",
    );
    if ("caches" in window) {
      const c = await caches.open("manhwahub-demo-v1");
      setDemoCached((await c.keys()).length > 0);
    }
  }
  useEffect(() => {
    void measure();
  }, []);
  async function perform() {
    setBusy(true);
    try {
      if (confirm === "history") await repository.deleteHistory();
      if (confirm === "reset") await repository.reset();
      if (confirm === "cache" || confirm === "reset") {
        await repository.clearCache();
        if ("caches" in window)
          for (const key of await caches.keys())
            if (
              key.startsWith("manhwahub-demo") ||
              key.startsWith("manhwahub-runtime")
            )
              await caches.delete(key);
      }
      await reload();
      await measure();
      notify(
        confirm === "reset"
          ? "Application data reset."
          : confirm === "history"
            ? "History cleared."
            : "Cached data cleared.",
      );
      setConfirm("");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not complete the action.");
    } finally {
      setBusy(false);
    }
  }
  async function cacheDemo() {
    setBusy(true);
    try {
      if (!("caches" in window))
        throw new Error("Offline caching needs a secure HTTPS connection.");
      const cache = await caches.open("manhwahub-demo-v1");
      const assets = ["lantern", "cloudbound", "train"].flatMap((name) => [
        `/demo/${name}.webp`,
        ...[1, 2, 3].flatMap((n) => [
          `/demo/${name}-${n}-intro.svg`,
          `/demo/${name}-${n}-end.svg`,
        ]),
      ]);
      await cache.addAll(assets);
      await measure();
      notify("Original demo chapters saved for offline reading.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not cache the demo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1>
            Settings<span className="accent">.</span>
          </h1>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Settings sections">
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="settings-panel">
        {tab === "Appearance" && (
          <>
            <h2>Set the mood</h2>
            <p className="muted">
              A comfortable space for every kind of reader.
            </p>
            <div className="theme-options">
              {(["dark", "light", "oled"] as const).map((t) => (
                <button
                  key={t}
                  className={`theme-option theme-${t} ${data.settings.appearance === t ? "selected" : ""}`}
                  aria-pressed={data.settings.appearance === t}
                  onClick={() => void update({ appearance: t })}
                >
                  <span className="theme-preview">
                    <span />
                    <span />
                    <span />
                  </span>
                  <strong>
                    {t === "oled"
                      ? "OLED black"
                      : t[0].toUpperCase() + t.slice(1)}
                  </strong>
                  {data.settings.appearance === t && <small>Selected</small>}
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "Reader" && (
          <>
            <h2>Your reading preferences</h2>
            <p className="muted">Changes also apply to the current reader.</p>
            <ReaderSettingsForm />
          </>
        )}
        {tab === "Content" && (
          <>
            <h2>Choose what you see</h2>
            <p className="muted">
              These filters apply everywhere, including Home, search, your
              library, and direct links.
            </p>
            <h3 className="setting-heading">Allowed content ratings</h3>
            {ratings.map((r) => (
              <Toggle
                key={r}
                label={r[0].toUpperCase() + r.slice(1)}
                description={
                  r === "mature"
                    ? "Includes titles with an unknown age rating."
                    : r === "explicit"
                      ? "18+ metadata may be displayed when enabled."
                      : r === "safe"
                        ? "All-ages content."
                        : "May contain mild suggestive themes."
                }
                checked={data.settings.allowedRatings.includes(r)}
                onChange={(v) =>
                  void update({
                    allowedRatings: v
                      ? [...data.settings.allowedRatings, r]
                      : data.settings.allowedRatings.filter((x) => x !== r),
                  })
                }
              />
            ))}
            <h3 className="setting-heading">Preferred languages</h3>
            <p className="small muted">
              Current adapters supply English metadata or chapters. Other
              choices are ready for future providers.
            </p>
            <div className="checkbox-grid">
              {[
                ["en", "English"],
                ["ja", "Japanese"],
                ["ko", "Korean"],
                ["zh", "Chinese"],
              ].map(([code, name]) => (
                <label key={code}>
                  <input
                    type="checkbox"
                    checked={data.settings.languages.includes(code as "en")}
                    onChange={(e) =>
                      void update({
                        languages: e.target.checked
                          ? [...data.settings.languages, code as "en"]
                          : data.settings.languages.filter((l) => l !== code),
                      })
                    }
                  />
                  {name}
                </label>
              ))}
            </div>
            <h3 className="setting-heading">Blocked genres</h3>
            <div className="checkbox-grid">
              {genres.map((g) => (
                <label key={g}>
                  <input
                    type="checkbox"
                    checked={data.settings.blockedGenres.includes(g)}
                    onChange={(e) =>
                      void update({
                        blockedGenres: e.target.checked
                          ? [...data.settings.blockedGenres, g]
                          : data.settings.blockedGenres.filter((x) => x !== g),
                      })
                    }
                  />
                  {g}
                </label>
              ))}
            </div>
          </>
        )}
        {tab === "Sources" && (
          <>
            <Layers size={32} />
            <h2>Your source collection</h2>
            <p>
              Enable providers, inspect their capabilities, and check whether
              their API is responding.
            </p>
            <Link className="button primary" href="/sources/">
              Manage sources
            </Link>
          </>
        )}
        {tab === "Data" && (
          <>
            <h2>Your data stays with you</h2>
            <p className="muted">
              Your library and reading progress live in this browser. Keep a
              backup before switching devices or clearing browser data.
            </p>
            <div className="storage-card">
              <HardDrive size={25} />
              <div>
                <strong>Device storage</strong>
                <p>{usage}</p>
                <small>
                  Includes app files, local records, and cached demo pages.
                </small>
              </div>
              <Button onClick={() => void measure()}>Refresh</Button>
            </div>
            <div className="data-action">
              <div>
                <h3>JSON backup</h3>
                <p>
                  Includes library, favorites, history, reading progress, and
                  all settings.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={async () => {
                    try {
                      downloadBackup(await repository.load());
                      notify("Backup exported.");
                    } catch {
                      notify("Could not export local data.");
                    }
                  }}
                >
                  <Download size={17} />
                  Export data
                </Button>
                <Button onClick={() => file.current?.click()}>
                  <Upload size={17} />
                  Import data
                </Button>
              </div>
            </div>
            <input
              hidden
              ref={file}
              type="file"
              accept="application/json,.json"
              aria-label="Import backup file"
              onChange={async (e) => {
                const chosen = e.target.files?.[0];
                if (!chosen) return;
                setImportError("");
                try {
                  if (chosen.size > 15 * 1024 * 1024)
                    throw new Error("Backup must be smaller than 15 MB.");
                  setPending(parseBackup(await chosen.text()));
                } catch (e) {
                  setImportError(
                    e instanceof Error ? e.message : "Invalid backup.",
                  );
                } finally {
                  if (file.current) file.current.value = "";
                }
              }}
            />
            {importError && (
              <p className="error-text" role="alert">
                {importError}
              </p>
            )}
            <div className="data-action">
              <div>
                <h3>Offline demo chapters</h3>
                <p>
                  {demoCached
                    ? "Original chapters are cached on this device."
                    : "Save original demo artwork and story pages for offline reading. No third-party images are downloaded."}
                </p>
              </div>
              <Button disabled={busy} onClick={() => void cacheDemo()}>
                <Download size={17} />
                {busy
                  ? "Saving…"
                  : demoCached
                    ? "Refresh demo cache"
                    : "Save demo offline"}
              </Button>
            </div>
            <div className="data-action">
              <div>
                <h3>Clear cache</h3>
                <p>
                  Remove metadata and demo image caches. Keep your library and
                  offline application shell.
                </p>
              </div>
              <Button onClick={() => setConfirm("cache")}>Clear cache</Button>
            </div>
            <div className="data-action">
              <div>
                <h3>Clear history</h3>
                <p>
                  Remove reading history while keeping your saved positions.
                </p>
              </div>
              <Button onClick={() => setConfirm("history")}>
                Clear history
              </Button>
            </div>
            <div className="data-action">
              <div>
                <h3>Reset application</h3>
                <p>
                  Remove all personal data and return preferences to defaults.
                </p>
              </div>
              <Button className="danger" onClick={() => setConfirm("reset")}>
                <Trash2 size={16} />
                Reset application
              </Button>
            </div>
            <p className="small muted">
              Install ManhwaHub through your browser’s “Add to home screen” or
              “Install app” menu. An offline shell is available after the first
              successful online load.
            </p>
          </>
        )}
      </section>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm("")}
        title={
          confirm === "reset"
            ? "Reset ManhwaHub?"
            : confirm === "history"
              ? "Clear reading history?"
              : "Clear cached data?"
        }
      >
        <p>
          {confirm === "reset"
            ? "This removes your library, favorites, history, reading progress and settings from this device. Export a backup first if you want to keep them."
            : confirm === "history"
              ? "Your library and reading positions will be preserved."
              : "Your library and reading progress will be preserved. Offline demo pages will need to be saved again."}
        </p>
        <div className="modal-actions">
          <Button disabled={busy} onClick={() => setConfirm("")}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            className="danger"
            onClick={() => void perform()}
          >
            {busy ? "Working…" : "Confirm"}
          </Button>
        </div>
      </Modal>
      <Modal
        open={!!pending}
        onClose={() => setPending(undefined)}
        title="Restore this backup?"
      >
        <p>
          This replaces the current library, history, progress, and settings
          with {pending?.library.length} library entries,{" "}
          {pending?.progress.length} chapter positions, and{" "}
          {pending?.history.length} history entries. Export your current data
          first if you want to keep it.
        </p>
        <div className="modal-actions">
          <Button onClick={() => setPending(undefined)}>Cancel</Button>
          <Button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (!pending) return;
              setBusy(true);
              try {
                await repository.replace(pending);
                await reload();
                setPending(undefined);
                notify("Backup restored.");
              } catch (e) {
                notify(
                  e instanceof Error
                    ? e.message
                    : "Import failed. No data was changed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Replace and restore
          </Button>
        </div>
      </Modal>
    </>
  );
}
