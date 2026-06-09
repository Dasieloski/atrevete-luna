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
  transfers: Record<string, ProductBreakdown>
  sales: Record<string, ProductBreakdown>
  factoryStock: Record<string, number>
  warehouseStock: Record<string, number>
  payments: number
  remaining: number
}

export interface DailyResumenTableProps {
  rows: ResumenRow[]
  products: ProductInfo[]
  totalPending: number
  totalPaid: number
}

const PROD_COLORS = [
  { dot: 'bg-blue-500', text: 'text-blue-700' },
  { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  { dot: 'bg-amber-500', text: 'text-amber-700' },
]

function MiniList({
  products,
  items,
  showValue = false,
}: {
  products: ProductInfo[]
  items: Record<string, ProductBreakdown>
  showValue?: boolean
}) {
  const hasAny = products.some((p) => (items[p.id]?.boxes ?? 0) > 0)
  if (!hasAny) return <span className="text-sm text-muted-soft">—</span>

  return (
    <div className="flex flex-col gap-0.5">
      {products.map((prod, idx) => {
        const b = items[prod.id]
        if (!b || b.boxes === 0) return null
        const color = PROD_COLORS[idx % PROD_COLORS.length]
        return (
          <div key={prod.id} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', color.dot)} />
            <span className={cn('text-[11px] font-medium', color.text)}>
              {prod.name.split(' ')[0]}
            </span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-ink">
              {formatNumber(b.boxes)} <span className="text-[10px] font-normal text-muted">cjs</span>
            </span>
          </div>
        )
      })}
      {showValue && (
        <span className="mt-0.5 text-right text-[10px] tabular-nums text-muted">
          {formatCurrency(
            Object.values(items).reduce((s, v) => s + v.value, 0)
          )} precio fábrica
        </span>
      )}
    </div>
  )
}

function MiniStockList({
  products,
  stock,
}: {
  products: ProductInfo[]
  stock: Record<string, number>
}) {
  const hasAny = products.some((p) => (stock[p.id] ?? 0) > 0)
  if (!hasAny) return <span className="text-sm text-muted-soft">—</span>

  return (
    <div className="flex flex-col gap-0.5">
      {products.map((prod, idx) => {
        const boxes = stock[prod.id] ?? 0
        if (boxes === 0) return null
        const color = PROD_COLORS[idx % PROD_COLORS.length]
        return (
          <div key={prod.id} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', color.dot)} />
            <span className={cn('text-[11px] font-medium', color.text)}>
              {prod.name.split(' ')[0]}
            </span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-ink">
              {formatNumber(boxes)} <span className="text-[10px] font-normal text-muted">cjs</span>
            </span>
          </div>
        )
      })}
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
      columnHelper.accessor(
        (row) => Object.values(row.products).reduce((s, v) => s + v.boxes, 0),
        {
          id: 'produced',
          header: 'Producido por fábrica',
          cell: (info) => {
            const row = info.row.original
            return <MiniList products={products} items={row.products} showValue />
          },
          sortingFn: 'basic',
        }
      ),
      columnHelper.accessor(
        (row) => Object.values(row.transfers).reduce((s, v) => s + v.boxes, 0),
        {
          id: 'recogido',
          header: 'Recogido',
          cell: (info) => {
            const row = info.row.original
            return <MiniList products={products} items={row.transfers} showValue />
          },
          sortingFn: 'basic',
        }
      ),
      columnHelper.accessor(
        (row) => Object.values(row.sales).reduce((s, v) => s + v.boxes, 0),
        {
          id: 'vendido',
          header: 'Vendido',
          cell: (info) => {
            const row = info.row.original
            return <MiniList products={products} items={row.sales} showValue />
          },
          sortingFn: 'basic',
        }
      ),
      columnHelper.accessor(
        (row) => Object.values(row.factoryStock).reduce((s, v) => s + v, 0),
        {
          id: 'porRecoger',
          header: 'Por recoger',
          cell: (info) => {
            const row = info.row.original
            return <MiniStockList products={products} stock={row.factoryStock} />
          },
          sortingFn: 'basic',
        }
      ),
      columnHelper.accessor(
        (row) => Object.values(row.warehouseStock).reduce((s, v) => s + v, 0),
        {
          id: 'enAlmacen',
          header: 'En almacén',
          cell: (info) => {
            const row = info.row.original
            return <MiniStockList products={products} stock={row.warehouseStock} />
          },
          sortingFn: 'basic',
        }
      ),
      columnHelper.accessor('payments', {
        header: 'Pagado',
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
      transfers: {} as Record<string, { boxes: number; value: number }>,
      sales: {} as Record<string, { boxes: number; value: number }>,
      factoryStock: {} as Record<string, number>,
      warehouseStock: {} as Record<string, number>,
      payments: 0,
    }
    for (const row of rows) {
      for (const prod of products) {
        if (!t.products[prod.id]) t.products[prod.id] = { boxes: 0, value: 0 }
        if (!t.transfers[prod.id]) t.transfers[prod.id] = { boxes: 0, value: 0 }
        if (!t.sales[prod.id]) t.sales[prod.id] = { boxes: 0, value: 0 }

        const pb = row.products[prod.id]
        if (pb) { t.products[prod.id].boxes += pb.boxes; t.products[prod.id].value += pb.value }
        const tb = row.transfers[prod.id]
        if (tb) { t.transfers[prod.id].boxes += tb.boxes; t.transfers[prod.id].value += tb.value }
        const sb = row.sales[prod.id]
        if (sb) { t.sales[prod.id].boxes += sb.boxes; t.sales[prod.id].value += sb.value }

        t.factoryStock[prod.id] = (t.factoryStock[prod.id] || 0) + row.factoryStock[prod.id]
        t.warehouseStock[prod.id] = (t.warehouseStock[prod.id] || 0) + row.warehouseStock[prod.id]
      }
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
                  <td key={cell.id} className="whitespace-nowrap px-4 py-3 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-b border-hairline bg-ash/50 font-semibold">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-ink">Total</td>
              <td className="whitespace-nowrap px-4 py-3">
                <MiniList products={products} items={totals.products} showValue />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <MiniList products={products} items={totals.transfers} showValue />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <MiniList products={products} items={totals.sales} showValue />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <MiniStockList products={products} stock={totals.factoryStock} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <MiniStockList products={products} stock={totals.warehouseStock} />
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
