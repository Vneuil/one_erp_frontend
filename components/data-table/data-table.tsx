"use client";

import * as React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  onRowClick?: (item: T) => void;
  pageSize?: number;
}

export function DataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  searchKey,
  searchPlaceholder,
  filterSlot,
  actionSlot,
  onRowClick,
  pageSize = 8,
}: DataTableProps<T>) {
  const { t, isIndonesian } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Filter
  const filteredData = React.useMemo(() => {
    if (!search.trim() || !searchKey) return data;
    const q = search.toLowerCase();
    return data.filter((item) => {
      const val = (item as Record<string, unknown>)[searchKey];
      return val ? String(val).toLowerCase().includes(q) : false;
    });
  }, [data, search, searchKey]);

  // Sort
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey];
      const valB = (b as Record<string, unknown>)[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      const cmp = String(valA).localeCompare(String(valB));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedData = React.useMemo(() => {
    const start = (visiblePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, visiblePage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          {searchKey && (
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder ?? t.common.search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
          )}
          {filterSlot}
        </div>

        {actionSlot && <div className="flex items-center gap-2">{actionSlot}</div>}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-white shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1.5 hover:text-foreground cursor-pointer font-semibold"
                    >
                      <span>{col.header}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                    <span>{t.common.loading}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  {t.common.noRecords}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, idx) => (
                <TableRow
                  key={String((item as Record<string, unknown>)["id"] ?? idx)}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }
                    >
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {t.common.showing} {paginatedData.length > 0 ? (visiblePage - 1) * pageSize + 1 : 0} {isIndonesian ? "sampai" : "to"}{" "}
          {Math.min(visiblePage * pageSize, sortedData.length)} {t.common.of} {sortedData.length} {t.common.entries}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={visiblePage === 1}
            onClick={() => setCurrentPage(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={visiblePage === 1}
            onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 py-1 font-medium text-foreground">
            {t.common.page} {visiblePage} {t.common.of} {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={visiblePage === totalPages}
            onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={visiblePage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
