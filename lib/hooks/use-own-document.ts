import { useAppStore } from "@/stores/app-store";

/**
 * Returns a predicate telling whether a document was raised by the signed-in
 * user. Mirrors the backend's segregation-of-duties check (case-insensitive
 * email match; unknown owners never match) so the UI can hide approve buttons
 * the server would refuse. The server remains authoritative.
 */
export function useIsOwnDocument(): (ownerEmail?: string | null) => boolean {
  const email = useAppStore((s) => s.currentUser?.email);
  return (ownerEmail) => {
    const a = (email ?? "").trim().toLowerCase();
    const b = (ownerEmail ?? "").trim().toLowerCase();
    return a !== "" && a === b;
  };
}
