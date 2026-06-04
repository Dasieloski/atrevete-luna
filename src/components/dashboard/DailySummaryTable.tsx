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
            <span className="font-mono font-semibold text-accent-teal">{formatCurrency(val)}</span>
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
      <div className="bg-surface-card rounded-xl border border-hairline p-8 text-center">
        <p className="text-sm text-muted">No hay datos para el período seleccionado</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
      <div className="p-4 border-b border-hairline">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted shrink-0" />
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
              <tr key={headerGroup.id} className="border-b border-hairline bg-surface-soft/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-body-strong transition-colors whitespace-nowrap"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ChevronUp className="w-3.5 h-3.5 text-primary" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ChevronDown className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-soft" />
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
                className="border-b border-hairline/60 hover:bg-surface-soft/40 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-hairline bg-surface-soft/30">
        <span className="text-xs text-muted">
          {table.getFilteredRowModel().rows.length} registro(s) · Pág. {table.getState().pagination.pageIndex + 1} de{' '}
          {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-md hover:bg-surface-soft disabled:opacity-30 disabled:cursor-not-allowed text-body"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-md hover:bg-surface-soft disabled:opacity-30 disabled:cursor-not-allowed text-body"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
