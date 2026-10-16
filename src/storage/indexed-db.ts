import {
  backupSchema,
  defaultSettings,
  librarySchema,
  progressSchema,
  settingsSchema,
  type Backup,
  type LibraryEntry,
  type ReadingProgress,
  type AppSettings,
} from "@/types";
import type { UserRepository } from "./repository";
const STORES = ["library", "progress", "history", "settings", "cache"] as const;
type Store = (typeof STORES)[number];
let opening: Promise<IDBDatabase> | undefined;
function db() {
  if (!opening)
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("manhwahub", 1);
      r.onupgradeneeded = () => {
        for (const s of STORES)
          if (!r.result.objectStoreNames.contains(s))
            r.result.createObjectStore(s, { keyPath: "id" });
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => {
          r.result.close();
          opening = undefined;
        };
        resolve(r.result);
      };
      r.onerror = () => {
        opening = undefined;
        reject(
          new Error(
            "Local storage could not open. Check browser storage permissions.",
          ),
        );
      };
      r.onblocked = () =>
        reject(
          new Error("Close other ManhwaHub tabs to upgrade local storage."),
        );
    });
  return opening;
}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
async function read<T>(store: Store) {
  return request<T[]>(
    (await db()).transaction(store).objectStore(store).getAll(),
  );
}
async function write(stores: Store[], fn: (tx: IDBTransaction) => void) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const t = d.transaction(stores, "readwrite");
    t.oncomplete = () => resolve();
    t.onerror = () =>
      reject(t.error || new Error("Failed to save local data."));
    t.onabort = () =>
      reject(t.error || new Error("Local save was interrupted."));
    try {
      fn(t);
    } catch (e) {
      t.abort();
      reject(e);
    }
  });
}
export const repository: UserRepository = {
  async load() {
    const [library, progress, history, settings] = await Promise.all([
      read("library"),
      read("progress"),
      read("history"),
      read<{ id: string; value: AppSettings }>("settings"),
    ]);
    return backupSchema.parse({
      version: 1,
      exportedAt: new Date().toISOString(),
      library,
      progress,
      history,
      settings: settings[0]?.value ?? structuredClone(defaultSettings),
    });
  },
  async putLibrary(entry: LibraryEntry) {
    librarySchema.parse(entry);
    await write(["library"], (t) => t.objectStore("library").put(entry));
  },
  async removeLibrary(id) {
    await write(["library"], (t) => t.objectStore("library").delete(id));
  },
  async saveProgress(entry: ReadingProgress) {
    progressSchema.parse(entry);
    await write(["progress", "history"], (t) => {
      const p = t.objectStore("progress");
      const r = p.get(entry.id);
      r.onsuccess = () => {
        const merged = {
          ...entry,
          completed: entry.completed || r.result?.completed === true,
        };
        p.put(merged);
        t.objectStore("history").put(merged);
      };
    });
    const items = await read<ReadingProgress>("history");
    if (items.length > 1000)
      await write(["history"], (t) =>
        items
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(1000)
          .forEach((p) => t.objectStore("history").delete(p.id)),
      );
  },
  async saveSettings(value) {
    settingsSchema.parse(value);
    await write(["settings"], (t) =>
      t.objectStore("settings").put({ id: "app", value }),
    );
  },
  async deleteHistory(id) {
    await write(["history"], (t) =>
      id
        ? t.objectStore("history").delete(id)
        : t.objectStore("history").clear(),
    );
  },
  async replace(input: Backup) {
    const b = backupSchema.parse(input);
    await write(["library", "progress", "history", "settings"], (t) => {
      for (const name of ["library", "progress", "history"] as const) {
        const s = t.objectStore(name);
        s.clear();
        b[name].forEach((v) => s.put(v));
      }
      t.objectStore("settings").clear();
      t.objectStore("settings").put({ id: "app", value: b.settings });
    });
  },
  async clearCache() {
    await write(["cache"], (t) => t.objectStore("cache").clear());
  },
  async reset() {
    await write([...STORES], (t) =>
      STORES.forEach((s) => t.objectStore(s).clear()),
    );
  },
};
export async function readCache<T>(id: string): Promise<T | undefined> {
  try {
    const row = await request<
      { id: string; expires: number; value: T } | undefined
    >((await db()).transaction("cache").objectStore("cache").get(id));
    return row && row.expires > Date.now() ? row.value : undefined;
  } catch {
    return undefined;
  }
}
export async function putCache(id: string, value: unknown, ttl = 300000) {
  try {
    await write(["cache"], (t) =>
      t.objectStore("cache").put({ id, value, expires: Date.now() + ttl }),
    );
    const all = await read<{ id: string; expires: number }>("cache");
    if (all.length > 80)
      await write(["cache"], (t) =>
        all
          .sort((a, b) => b.expires - a.expires)
          .slice(80)
          .forEach((r) => t.objectStore("cache").delete(r.id)),
      );
  } catch {
    /* A metadata cache failure must not break reading. */
  }
}
