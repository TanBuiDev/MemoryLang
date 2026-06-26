import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Column<T> {
  header: string
  accessor: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchPlaceholder?: string
  searchFilter?: (row: T, query: string) => boolean
  isLoading?: boolean
  actions?: React.ReactNode
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Tìm kiếm...',
  searchFilter,
  isLoading = false,
  actions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter data
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchFilter) return data
    return data.filter((row) => searchFilter(row, searchQuery))
  }, [data, searchQuery, searchFilter])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  return (
    <div className="flex flex-col gap-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {searchFilter && (
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-border rounded-md bg-card text-sm font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-primary shadow-[2px_2px_0_var(--border)] focus:shadow-[4px_4px_0_var(--border)] transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          </div>
        )}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {actions}
        </div>
      </div>

      {/* Table Body Container */}
      <div className="neo-card bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted">
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-4 py-3 font-black text-foreground uppercase tracking-wider select-none border-r border-border/30 last:border-r-0',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center font-bold text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center font-bold text-muted-foreground">
                  Không tìm thấy dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 odd:bg-card even:bg-muted/10 transition-colors"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(
                        'px-4 py-3.5 font-medium border-r border-border/30 last:border-r-0 align-middle',
                        col.className
                      )}
                    >
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs font-bold text-muted-foreground">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} trong tổng số {filteredData.length} mục
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="neo-button min-h-0 p-1.5 rounded bg-card border border-border disabled:opacity-50 disabled:shadow-none hover:bg-muted active:neo-button-active transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-black px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="neo-button min-h-0 p-1.5 rounded bg-card border border-border disabled:opacity-50 disabled:shadow-none hover:bg-muted active:neo-button-active transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
