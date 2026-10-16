"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { repository } from "@/storage/indexed-db";
import {
  defaultSettings,
  type Backup,
  type AppSettings,
  type LibraryEntry,
  type ReadingProgress,
  type Series,
  type ReaderSettings,
} from "@/types";
const initial: Backup = {
  version: 1,
  exportedAt: "",
  library: [],
  history: [],
  progress: [],
  settings: defaultSettings,
};
interface Context {
  data: Backup;
  ready: boolean;
  error: string;
  notice: string;
  notify: (s: string) => void;
  reload: () => Promise<void>;
  setSettings: (s: AppSettings) => Promise<void>;
  setReader: (s: Partial<ReaderSettings>) => Promise<void>;
  putLibrary: (
    s: Series,
    patch?: Partial<Pick<LibraryEntry, "favorite" | "status">>,
  ) => Promise<void>;
  removeLibrary: (id: string) => Promise<void>;
  saveProgress: (p: ReadingProgress) => Promise<void>;
  deleteHistory: (id?: string) => Promise<void>;
}
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const current = useRef(data);
  current.current = data;
  const notify = useCallback((s: string) => setNotice(s), []);
  const reload = useCallback(async () => {
    try {
      const d = await repository.load();
      current.current = d;
      setData(d);
      setError("");
    } catch (e) {
      setError(
        "Local data could not be read. It may be corrupt or storage permission is blocked. You can restore a valid backup or reset data in Data settings.",
      );
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.appearance;
    try {
      localStorage.setItem("manhwahub-theme", data.settings.appearance);
    } catch {}
  }, [data.settings.appearance]);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() =>
          notify(
            "Offline shell could not be installed. Reading online still works.",
          ),
        );
  }, [notify]);
  async function guard(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save your changes.");
      throw e;
    }
  }
  const setSettings = async (settings: AppSettings) =>
    guard(async () => {
      await repository.saveSettings(settings);
      setData((d) => ({ ...d, settings }));
      current.current = { ...current.current, settings };
    });
  const value: Context = {
    data,
    ready,
    error,
    notice,
    notify,
    reload,
    setSettings,
    setReader: (s) =>
      setSettings({
        ...current.current.settings,
        reader: { ...current.current.settings.reader, ...s },
      }),
    putLibrary: async (series, patch = {}) =>
      guard(async () => {
        const previous = current.current.library.find(
          (x) => x.id === series.canonicalId,
        );
        const entry: LibraryEntry = {
          id: series.canonicalId,
          series,
          status: previous?.status || "Plan to Read",
          favorite: previous?.favorite || false,
          addedAt: previous?.addedAt || Date.now(),
          updatedAt: Date.now(),
          ...patch,
        };
        await repository.putLibrary(entry);
        setData((d) => ({
          ...d,
          library: [...d.library.filter((x) => x.id !== entry.id), entry],
        }));
      }),
    removeLibrary: async (id) =>
      guard(async () => {
        await repository.removeLibrary(id);
        setData((d) => ({
          ...d,
          library: d.library.filter((x) => x.id !== id),
        }));
      }),
    saveProgress: async (p) =>
      guard(async () => {
        await repository.saveProgress(p);
        setData((d) => {
          const merged = {
            ...p,
            completed:
              p.completed ||
              d.progress.some((x) => x.id === p.id && x.completed),
          };
          return {
            ...d,
            progress: [...d.progress.filter((x) => x.id !== p.id), merged],
            history: [...d.history.filter((x) => x.id !== p.id), merged]
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 1000),
          };
        });
      }),
    deleteHistory: async (id) =>
      guard(async () => {
        await repository.deleteHistory(id);
        setData((d) => ({
          ...d,
          history: id ? d.history.filter((x) => x.id !== id) : [],
        }));
      }),
  };
  return (
    <AppContext.Provider value={value}>
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("AppProvider missing");
  return c;
}
