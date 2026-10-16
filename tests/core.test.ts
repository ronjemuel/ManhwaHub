import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  defaultSettings,
  visibleSeries,
  backupSchema,
  progressKey,
  type ReadingProgress,
} from "../src/types";
import { demoSeries } from "../src/sources/mock/data";
import { createDemoSource } from "../src/sources/mock";
import { SourceRegistry } from "../src/sources/registry";
import { equivalentChapter } from "../src/sources/normalizer";
import { normalizeKitsu } from "../src/sources/kitsu";
import { repository } from "../src/storage/indexed-db";
import { parseBackup } from "../src/storage/backup";
const ctx = { signal: new AbortController().signal, settings: defaultSettings };
const demo = createDemoSource();
const record = (overrides: Partial<ReadingProgress> = {}): ReadingProgress => ({
  id: progressKey("demo:lantern", "demo", "lantern.1"),
  canonicalId: "demo:lantern",
  sourceId: "demo",
  chapterId: "lantern.1",
  chapterNumber: 1,
  chapterTitle: "A light in the distance",
  series: demoSeries[0],
  scrollY: 1234,
  pageIndex: 1,
  pageOffset: 0.35,
  fraction: 0.6,
  completed: false,
  mode: "vertical",
  timestamp: 1,
  ...overrides,
});
test("rating policy hides mature/explicit across local entry surfaces", () => {
  assert.equal(
    demoSeries.filter((s) => visibleSeries(s, defaultSettings)).length,
    6,
  );
  assert.equal(visibleSeries(demoSeries[7], defaultSettings), false);
  assert.equal(
    visibleSeries(demoSeries[0], {
      ...defaultSettings,
      blockedGenres: ["Fantasy"],
    }),
    false,
  );
  assert.equal(
    visibleSeries(demoSeries[0], { ...defaultSettings, languages: ["ja"] }),
    false,
  );
});
test("registry searches, normalizes, filters and merges only explicitly mapped canonical IDs", async () => {
  const r = new SourceRegistry([demo, createDemoSource("demo-alt")]);
  const s = { ...defaultSettings, enabledSources: ["demo", "demo-alt"] };
  assert.equal((await r.search({ page: 1 }, s)).items.length, 6);
  assert.equal(
    (await r.search({ page: 1, query: "lantern" }, s)).items[0].canonicalId,
    "demo:lantern",
  );
  assert.equal(
    (await r.search({ page: 1, format: "Manhua" }, s)).items[0].title,
    "Letters from the Sky",
  );
  assert.equal(
    (await r.search({ page: 1, status: "Cancelled" }, s)).items[0].title,
    "Platform Zero",
  );
  assert.equal(
    (await r.search({ page: 1, genre: "Romance" }, s)).items.length,
    0,
  );
  assert.equal(
    (await r.search({ page: 1 }, { ...s, enabledSources: [] })).noSources,
    true,
  );
  await assert.rejects(() =>
    r.getSeries("demo", "lantern", { ...s, enabledSources: [] }),
  );
  await assert.rejects(() => r.getSeries("demo", "restricted", s), /hidden/);
});
test("partial provider failure keeps working-source results and reports actual failure", async () => {
  const failing = {
    ...demo,
    info: { ...demo.info, id: "failing", name: "Failing source" },
    search: async () => {
      throw new Error("Network unavailable");
    },
  };
  const r = new SourceRegistry([demo, failing]);
  const result = await r.search(
    { page: 1, query: "Cloudbound" },
    { ...defaultSettings, enabledSources: ["demo", "failing"] },
  );
  assert.equal(result.items.length, 2);
  assert.equal(result.errors.length, 1);
  assert.equal(r.status("failing").state, "unavailable");
  assert.equal(r.status("demo").state, "available");
});
test("demo chapters and pages exist; missing chapter rejects; matching requires exact unique edition", async () => {
  const chapters = await demo.getChapters("lantern", ctx);
  assert.equal(chapters.length, 3);
  assert.equal((await demo.getPages(chapters[0].id, ctx)).length, 3);
  await assert.rejects(() => demo.getPages("lantern.99", ctx));
  assert.equal(equivalentChapter(chapters[0], chapters)?.id, "lantern.1");
  assert.equal(
    equivalentChapter({ ...chapters[0], language: "ja" }, chapters),
    undefined,
  );
  assert.equal(
    equivalentChapter({ ...chapters[0], number: null }, chapters),
    undefined,
  );
  assert.equal(
    equivalentChapter(chapters[0], [chapters[0], chapters[0]]),
    undefined,
  );
});
test("Kitsu normalizer treats unknown age rating conservatively and never inserts raw HTML", () => {
  const r = normalizeKitsu({
    id: "1",
    type: "manga",
    attributes: {
      canonicalTitle: "Example",
      synopsis: "<b>Story</b>",
      ageRating: null,
      subtype: "manhwa",
      status: "finished",
    },
  });
  assert.equal(r.contentRating, "mature");
  assert.equal(r.description, "Story");
  assert.equal(r.readable, false);
  assert.equal(r.format, "Manhwa");
  assert.equal(r.status, "Completed");
  assert.equal(visibleSeries(r, defaultSettings), false);
});
test("IndexedDB library, favorites, statuses, progress and history persist; import validates atomically", async () => {
  await repository.reset();
  await repository.putLibrary({
    id: "demo:lantern",
    series: demoSeries[0],
    favorite: true,
    status: "Reading",
    addedAt: 1,
    updatedAt: 1,
  });
  await repository.saveProgress(record());
  await repository.saveSettings({ ...defaultSettings, appearance: "oled" });
  let data = await repository.load();
  assert.equal(data.library[0].favorite, true);
  assert.equal(data.progress[0].scrollY, 1234);
  assert.equal(data.progress[0].pageOffset, 0.35);
  assert.equal(data.history[0].chapterId, "lantern.1");
  assert.equal(data.settings.appearance, "oled");
  const exported = JSON.stringify(data);
  const backup = parseBackup(exported);
  await repository.reset();
  await repository.replace(backup);
  assert.deepEqual((await repository.load()).library, backup.library);
  await repository.saveProgress(
    record({ completed: true, fraction: 1, timestamp: 2 }),
  );
  await repository.saveProgress(record({ fraction: 0.2, timestamp: 3 }));
  data = await repository.load();
  assert.equal(data.progress[0].completed, true);
  assert.equal(data.history.length, 1);
  await repository.deleteHistory(data.history[0].id);
  assert.equal((await repository.load()).history.length, 0);
  assert.equal((await repository.load()).progress.length, 1);
  await repository.removeLibrary("demo:lantern");
  assert.equal((await repository.load()).library.length, 0);
  await repository.replace(backup);
  const unsafe = JSON.parse(exported);
  unsafe.library[0].series.cover = "javascript:alert(1)";
  assert.throws(() => parseBackup(JSON.stringify(unsafe)), /valid/);
  await assert.rejects(() => repository.replace(unsafe));
  assert.equal((await repository.load()).library[0].favorite, true);
  assert.throws(() => parseBackup("not json"), /JSON/);
  assert.throws(
    () => parseBackup(JSON.stringify({ ...backup, version: 8 })),
    /valid/,
  );
  assert.equal(
    backupSchema.safeParse({
      ...backup,
      library: [backup.library[0], backup.library[0]],
    }).success,
    false,
  );
  await repository.reset();
});
