import { apiClientDownload } from "@/lib/api/client";

/** Fetches an authenticated file endpoint and hands it to the browser as a download. */
export async function downloadFromApi(endpoint: string, fallbackName: string): Promise<void> {
  const res = await apiClientDownload(endpoint);
  if (!("blob" in res)) throw new Error("Berkas tidak tersedia untuk diunduh.");
  const url = URL.createObjectURL(res.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = res.filename || fallbackName;
  link.click();
  URL.revokeObjectURL(url);
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt";

/** Returns an error message when the file cannot be uploaded, otherwise null. */
export function checkUpload(file: File | null | undefined): string | null {
  if (!file) return null;
  if (file.size === 0) return "Berkas kosong.";
  if (file.size > MAX_UPLOAD_BYTES) return "Berkas lebih dari 10 MB.";
  return null;
}
