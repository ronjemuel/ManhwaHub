import { backupSchema, type Backup } from "@/types";
export function parseBackup(text: string): Backup {
  if (text.length > 15 * 1024 * 1024)
    throw new Error("This backup exceeds the 15 MB limit.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const r = backupSchema.safeParse(data);
  if (!r.success)
    throw new Error(
      "This is not a valid ManhwaHub V1 backup. No data was changed.",
    );
  return r.data;
}
export function downloadBackup(data: Backup) {
  const blob = new Blob(
    [
      JSON.stringify(
        { ...data, exportedAt: new Date().toISOString() },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `manhwahub-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
