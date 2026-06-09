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
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  CreditCard,
  Wallet,
} from 'lucide-react'
import { formatDate, formatCurrency, formatNumber } from '@/src/lib/format'
import { cn } from '@/src/lib/utils'

export interface ProductInfo {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

export interface ProductBreakdown {
  boxes: number
  value: number
}

export interface ResumenRow {
  date: string
  products: Record<string, ProductBreakdown>
  warehouseQty: number
  warehouseValue: number
  distributionQty: number
  distributionValue: number
  payments: number
  remaining: number
}

export interface DailyResumenTableProps {
  rows: ResumenRow[]
  products: ProductInfo[]
  totalPending: number
  totalPaid: number
}

function ProductCell({ boxes, value }: { boxes: number; value: number }) {
  const hasBoxes = boxes > 0
  const hasValue = value > 0
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'text-base font-semibold tabular-nums leading-tight',
          hasBoxes ? 'text-ink' : 'text-muted-soft'
        )}
      >
        {hasBoxes ? formatNumber(boxes) : '—'}
      </span>
      {hasValue && (
        <span className="text-[11px] tabular-nums leading-tight text-muted">
          {formatCurrency(value)} precio fábrica
        </span>
      )}
    </div>
  )
}

function ValueCell({
  qty,
  value,
  label,
  qtyClassName,
  valueClassName,
}: {
  qty: number
  value: number
  label: string
  qtyClassName?: string
  valueClassName?: string
}) {
  const hasQty = qty > 0
  const hasValue = value > 0
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'text-base font-semibold tabular-nums leading-tight',
          hasQty ? qtyClassName || 'text-ink' : 'text-muted-soft'
        )}
      >
        {hasQty ? formatNumber(qty) : '—'}
      </span>
      {hasValue && (
        <span
          className={cn(
            'text-[11px] tabular-nums leading-tight',
            valueClassName || 'text-muted'
          )}
        >
          {formatCurrency(value)} {label}
        </span>
      )}
    </div>
  )
}

export function DailyResumenTable({
  rows,
  products,
  totalPending,
  totalPaid,
}: DailyResumenTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')

  const columnHelper = createColumnHelper<ResumenRow>()

  const columns = useMemo(() => {
    const productCols = products.map((prod) =>
      columnHelper.accessor((row) => row.products[prod.id]?.boxes ?? 0, {
        id: `prod_${prod.id}`,
        header: prod.name.split(' ')[0],
        cell: (info) => {
          const row = info.row.original
          const breakdown = row.products[prod.id]
          return <ProductCell boxes={breakdown?.boxes ?? 0} value={breakdown?.value ?? 0} />
        },
        sortingFn: 'basic',
      })
    )

    return [
      columnHelper.accessor('date', {
        header: 'Fecha',
        cell: (info) => (
          <span className="whitespace-nowrap text-sm font-medium text-ink">
            {formatDate(info.getValue())}
          </span>
        ),
        sortingFn: 'text',
      }),
      ...productCols,
      columnHelper.accessor('warehouseQty', {
        header: 'Recogido',
        cell: (info) => {
          const row = info.row.original
          return (
            <ValueCell
              qty={row.warehouseQty}
              value={row.warehouseValue}
              label="precio fábrica"
            />
          )
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('distributionQty', {
        header: 'Vendido',
        cell: (info) => {
          const row = info.row.original
          return (
            <ValueCell
              qty={row.distributionQty}
              value={row.distributionValue}
              label="ventas"
              qtyClassName="text-primary"
              valueClassName="text-primary/80"
            />
          )
        },
        sortingFn: 'basic',
      }),
      columnHelper.accessor('payments', {
        header: 'Saldo Pagado',
        cell: (info) => {
          const val = info.getValue()
          return val > 0 ? (
            <span className="text-sm font-semibold tabular-nums text-success">
              {formatCurrency(val)}
            </span>
          ) : (
            <span className="text-sm tabular-nums text-muted-soft">—</span>
          )
        },
        sortingFn: 'basic',
      }),
    ]
  }, [columnHelper, products])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination: { pageIndex: 0, pageSize: 31 } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totals = useMemo(() => {
    const t = {
      products: {} as Record<string, { boxes: number; value: number }>,
      warehouseQty: 0,
      warehouseValue: 0,
      distributionQty: 0,
      distributionValue: 0,
      payments: 0,
    }
    for (const row of rows) {
      for (const prod of products) {
        if (!t.products[prod.id]) t.products[prod.id] = { boxes: 0, value: 0 }
        const b = row.products[prod.id]
        if (b) {
          t.products[prod.id].boxes += b.boxes
          t.products[prod.id].value += b.value
        }
      }
      t.warehouseQty += row.warehouseQty
      t.warehouseValue += row.warehouseValue
      t.distributionQty += row.distributionQty
      t.distributionValue += row.distributionValue
      t.payments += row.payments
    }
    return t
  }, [rows, products])

  if (rows.length === 0) {
    return (
      <div className="ts-card-pad text-center text-sm text-muted">
        No hay datos para mostrar
      </div>
    )
  }

  return (
    <section className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-ink">Resumen</h2>
        </div>
        <span className="text-xs text-muted">
          {rows.length} día{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Financial summary header */}
      <div className="grid grid-cols-2 gap-3 border-b border-hairline bg-surface/40 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3 rounded-lg border border-hairline-soft bg-ash/50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 text-warning">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Pendiente con fábrica
            </span>
            <span className="text-base font-semibold tabular-nums text-ink">
              {formatCurrency(totalPending)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-hairline-soft bg-ash/50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Pagado a fábrica
            </span>
            <span className="text-base font-semibold tabular-nums text-ink">
              {formatCurrency(totalPaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-hairline p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar fecha…"
            className="w-full bg-transparent text-sm text-body placeholder:text-muted-soft focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
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
                  <td key={cell.id} className="whitespace-nowrap px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-b border-hairline bg-ash/50 font-semibold">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-ink">Total</td>
              {products.map((prod) => (
                <td key={prod.id} className="whitespace-nowrap px-4 py-3">
                  <ProductCell
                    boxes={totals.products[prod.id]?.boxes ?? 0}
                    value={totals.products[prod.id]?.value ?? 0}
                  />
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3">
                <ValueCell
                  qty={totals.warehouseQty}
                  value={totals.warehouseValue}
                  label="precio fábrica"
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <ValueCell
                  qty={totals.distributionQty}
                  value={totals.distributionValue}
                  label="ventas"
                  qtyClassName="text-primary"
                  valueClassName="text-primary/80"
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {totals.payments > 0 ? (
                  <span className="text-sm font-semibold tabular-nums text-success">
                    {formatCurrency(totals.payments)}
                  </span>
                ) : (
                  <span className="text-sm tabular-nums text-muted-soft">—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 border-t border-hairline bg-ash/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {table.getFilteredRowModel().rows.length} registro(s)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Mostrar</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="rounded-md border border-hairline bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {[31, 50, 100, 200, 300].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">por página</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            Pág. {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
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
      </div>
    </section>
  )
}
