import type { ApiResponse } from "./client";

/** Collect every server page; never return a partial result as a total. */
export async function fetchAllPages<T>(fetchPage: (params: { page: number; perPage: number }) => Promise<ApiResponse<T[]>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchPage({ page, perPage: 100 });
    if (!result.success || !Array.isArray(result.data)) throw new Error(result.message || "Failed to load data");
    items.push(...result.data);
    if (!result.meta || page >= result.meta.totalPages) return items;
    if (result.data.length === 0 || result.meta.currentPage !== page) throw new Error("Incomplete pagination response");
  }
}
