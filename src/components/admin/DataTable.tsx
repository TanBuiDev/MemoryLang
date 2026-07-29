import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  fitContent?: boolean
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Tìm kiếm...',
  searchFilter,
  isLoading = false,
  actions,
  fitContent = false,
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
      {(searchFilter || actions) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {searchFilter && (
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-slate-900 rounded-xl bg-white text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_#000] focus:shadow-[4px_4px_0px_0px_#000] transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          )}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {actions}
          </div>
        </div>
      )}

      {/* Table Body Container */}
      <div className="neo-card bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm min-w-[640px]">
          <thead>
            <tr className="border-b-3 border-slate-900 bg-amber-100">
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-4 py-3 font-black text-slate-900 uppercase tracking-wider select-none border-r border-slate-300 last:border-r-0 text-xs',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr style={fitContent ? undefined : { height: `${itemsPerPage * 64}px` }}>
                <td colSpan={columns.length} className="px-4 py-8 text-center font-bold text-slate-500 align-middle">
                  <div className="flex flex-col items-center gap-3 justify-center">
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-[#fdc800] rounded-full animate-spin" />
                    <span className="text-xs font-black text-slate-700">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr style={fitContent ? undefined : { height: `${fitContent ? 64 : itemsPerPage * 64}px` }}>
                <td colSpan={columns.length} className="px-4 py-6 text-center font-bold text-slate-500 align-middle">
                  Không tìm thấy dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              <>
                {paginatedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-slate-200 hover:bg-slate-50 odd:bg-white even:bg-slate-50/50 transition-colors h-[64px]"
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className={cn(
                          'px-4 py-3 font-bold text-slate-800 border-r border-slate-200 last:border-r-0 align-middle text-xs sm:text-sm',
                          col.className
                        )}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Pad empty rows only when fitContent is false */}
                {!fitContent && paginatedData.length < itemsPerPage && (
                  Array.from({ length: itemsPerPage - paginatedData.length }).map((_, index) => (
                    <tr
                      key={`empty-${index}`}
                      className="border-b border-slate-100 opacity-0 pointer-events-none select-none h-[64px]"
                    >
                      {columns.map((col, colIndex) => (
                        <td
                          key={`empty-cell-${colIndex}`}
                          className={cn(
                            'px-4 py-3 border-r border-slate-100 last:border-r-0 align-middle',
                            col.className
                          )}
                        >
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {(!fitContent || totalPages > 1) && (
        <div className={cn(
          "flex items-center justify-between mt-1 px-1 min-h-[40px] select-none",
          isLoading && "opacity-60 pointer-events-none"
        )}>
          <span className="text-xs font-bold text-slate-600">
            {isLoading ? (
              "Đang tải dữ liệu..."
            ) : filteredData.length > 0 ? (
              `Hiển thị ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredData.length)} trong tổng số ${filteredData.length} mục`
            ) : (
              "Không có mục nào"
            )}
          </span>
          
          {totalPages > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={isLoading || currentPage === 1}
                className="neo-button p-1.5 h-8 min-h-0 w-8 rounded-lg bg-white border-2 border-slate-900 disabled:opacity-40 disabled:shadow-none hover:bg-slate-100 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-xs font-black text-slate-900 px-2">
                {isLoading ? "-" : `${currentPage} / ${Math.max(1, totalPages)}`}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={isLoading || currentPage === totalPages || totalPages <= 1}
                className="neo-button p-1.5 h-8 min-h-0 w-8 rounded-lg bg-white border-2 border-slate-900 disabled:opacity-40 disabled:shadow-none hover:bg-slate-100 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
