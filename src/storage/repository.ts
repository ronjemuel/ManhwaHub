import type {
  AppSettings,
  Backup,
  LibraryEntry,
  ReadingProgress,
} from "@/types";
export interface UserRepository {
  load(): Promise<Backup>;
  putLibrary(entry: LibraryEntry): Promise<void>;
  removeLibrary(id: string): Promise<void>;
  saveProgress(entry: ReadingProgress): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  deleteHistory(id?: string): Promise<void>;
  replace(data: Backup): Promise<void>;
  clearCache(): Promise<void>;
  reset(): Promise<void>;
}
