'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { formatDate, formatCurrency, formatNumber } from '@/src/lib/format'

interface ProductInfo {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

interface DayProduction {
  date: string
  production: Record<string, number>
  transfers: Record<string, number>
  sales: Record<string, { quantity: number; total: number }>
  factoryValue: number
}

interface DailySummaryTableProps {
  products: ProductInfo[]
  dailyData: Record<string, DayProduction>
}

export function DailySummaryTable({ products, dailyData }: DailySummaryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = useMemo(() => {
    return Object.values(dailyData)
      .filter((d) => Object.keys(d.production).length > 0 || Object.keys(d.sales).length > 0 || Object.keys(d.transfers).length > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const row: Record<string, unknown> = {
          date: d.date,
          totalProduction: Object.values(d.production).reduce((s, v) => s + v, 0),
          transfersTotal: Object.values(d.transfers).reduce((s, v) => s + v, 0),
          factoryValue: d.factoryValue,
          salesTotalQty: Object.values(d.sales).reduce((s, v) => s + v.quantity, 0),
          salesTotalValue: Object.values(d.sales).reduce((s, v) => s + v.total, 0),
        }
        for (const prod of products) {
          row[`prod_${prod.id}`] = d.production[prod.id] || 0
        }
        return row
      })
  }, [dailyData, products])

  const columnHelper = createColumnHelper<Record<string, unknown>>()

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor('date', {
        header: 'Fecha',
        cell: (info) => (
          <span className="font-medium text-ink whitespace-nowrap">{formatDate(info.getValue() as string)}</span>
        ),
        sortingFn: 'text',
      }),
      ...products.map((prod) =>
        columnHelper.accessor(`prod_${prod.id}`, {
          header: prod.name.split(' ').slice(0, 2).join(' '),
          cell: (info) => {
            const val = info.getValue() as number
            return val > 0 ? (
              <span className="font-mono text-body-strong">{formatNumber(val)}</span>
            ) : (
              <span className="font-mono text-muted-soft">—</span>
            )
          },
          sortingFn: 'basic',
        })
      ),
      columnHelper.accessor('totalProduction', {
        header: 'Total Prod.',
        cell: (info) => {
          const val = info.getValue() as number
          return val > 0 ? (
            <span className="font-mono font-semibold text-ink">{formatNumber(val)}</span>
          ) : (
            <span className="font-mono text-muted-soft">—</span>
          )
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('transfersTotal', {
        header: 'Almacén',
        cell: (info) => {
          const val = info.getValue() as number
          return val > 0 ? (
            <span className="font-mono text-body-strong">{formatNumber(val)}</span>
          ) : (
            <span className="font-mono text-muted-soft">—</span>
          )
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('factoryValue', {
        header: 'Valor Fábrica',
        cell: (info) => {
          const val = info.getValue() as number
          return val > 0 ? (
            <span className="font-mono font-semibold text-success">{formatCurrency(val)}</span>
          ) : (
            <span className="font-mono text-muted-soft">—</span>
          )
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('salesTotalQty', {
        header: 'Ud. Vendidas',
        cell: (info) => {
          const val = info.getValue() as number
          return val > 0 ? (
            <span className="font-mono text-body-strong">{formatNumber(val)}</span>
          ) : (
            <span className="font-mono text-muted-soft">—</span>
          )
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('salesTotalValue', {
        header: 'Valor Distrib.',
        cell: (info) => {
          const val = info.getValue() as number
          return val > 0 ? (
            <span className="font-mono font-semibold text-primary">{formatCurrency(val)}</span>
          ) : (
            <span className="font-mono text-muted-soft">—</span>
          )
        },
        sortingFn: 'basic',
      }),
    ]
    return cols
  }, [columnHelper, products])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  if (data.length === 0) {
    return (
      <div className="ts-card-pad text-center text-sm text-muted">
        No hay datos para el período seleccionado
      </div>
    )
  }

  return (
    <section className="ts-card overflow-hidden">
      <div className="border-b border-hairline p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar en la tabla..."
            className="w-full bg-transparent text-sm text-body placeholder:text-muted-soft focus:outline-none"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-hairline bg-ash/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted transition-colors hover:text-ink"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5 text-primary" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ChevronDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-soft" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-hairline/60 transition-colors last:border-0 hover:bg-ash/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-4 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-hairline bg-ash/30 px-4 py-3">
        <span className="text-xs text-muted">
          {table.getFilteredRowModel().rows.length} registro(s) · Pág. {table.getState().pagination.pageIndex + 1} de{' '}
          {table.getPageCount()}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="ts-btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="ts-btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
