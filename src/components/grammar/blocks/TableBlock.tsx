import type { LessonBlock, TableContent } from '@/types/grammar.types'

interface TableBlockProps {
  block: LessonBlock
}

export function TableBlock({ block }: TableBlockProps) {
  const { headers, rows, caption } = block.content as unknown as TableContent

  return (
    <div className="my-4 overflow-x-auto border-2 border-(--border) rounded-lg">
      {caption && (
        <div className="px-4 py-2 font-semibold text-sm bg-yellow-300 border-b-2 border-(--border)">
          {caption}
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-purple-100">
            {headers.map((header, i) => (
              <th
                key={i}
                className="border-r-2 border-b-2 border-(--border) px-4 py-3 text-left font-bold text-sm last:border-r-0"
                dangerouslySetInnerHTML={{ __html: header }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-r-2 border-(--border) px-4 py-2 text-sm last:border-r-0"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
