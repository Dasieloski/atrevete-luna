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

function ProductCell({ boxes, value }: { boxes: number; value: number }) {
  const hasBoxes = boxes > 0
  const hasValue = value > 0
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'text-sm font-semibold tabular-nums leading-tight',
          hasBoxes ? 'text-ink' : 'text-muted-soft'
        )}
      >
        {hasBoxes ? formatNumber(boxes) : '—'}
      </span>
      {hasValue && (
        <span className="text-[10px] tabular-nums leading-tight text-muted">
          {formatCurrency(value)}
        </span>
      )}
    </div>
  )
}

function StockCell({ boxes }: { boxes: number }) {
  const hasBoxes = boxes > 0
  return (
    <span
      className={cn(
        'text-sm font-semibold tabular-nums leading-tight',
        hasBoxes ? 'text-ink' : 'text-muted-soft'
      )}
    >
      {hasBoxes ? `${formatNumber(boxes)} cjs` : '—'}
    </span>
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
    const makeProductCols = (
      accessor: (row: ResumenRow, prodId: string) => ProductBreakdown | number,
      isStock = false
    ) =>
      products.map((prod) =>
        columnHelper.accessor(
          (row) => {
            const v = accessor(row, prod.id)
            return typeof v === 'number' ? v : v.boxes
          },
          {
            id: `${isStock ? 'stock' : 'col'}_${prod.id}`,
            header: prod.name.split(' ')[0],
            cell: (info) => {
              const row = info.row.original
              if (isStock) {
                const boxes = row.factoryStock[prod.id] ?? 0
                return <StockCell boxes={boxes} />
              }
              const b = row.products[prod.id]
              return <ProductCell boxes={b?.boxes ?? 0} value={b?.value ?? 0} />
            },
            sortingFn: 'basic',
          }
        )
      )

    const transferCols = products.map((prod) =>
      columnHelper.accessor((row) => row.transfers[prod.id]?.boxes ?? 0, {
        id: `trans_${prod.id}`,
        header: prod.name.split(' ')[0],
        cell: (info) => {
          const row = info.row.original
          const b = row.transfers[prod.id]
          return <ProductCell boxes={b?.boxes ?? 0} value={b?.value ?? 0} />
        },
        sortingFn: 'basic',
      })
    )

    const saleCols = products.map((prod) =>
      columnHelper.accessor((row) => row.sales[prod.id]?.boxes ?? 0, {
        id: `sale_${prod.id}`,
        header: prod.name.split(' ')[0],
        cell: (info) => {
          const row = info.row.original
          const b = row.sales[prod.id]
          return <ProductCell boxes={b?.boxes ?? 0} value={b?.value ?? 0} />
        },
        sortingFn: 'basic',
      })
    )

    const factoryStockCols = products.map((prod) =>
      columnHelper.accessor((row) => row.factoryStock[prod.id] ?? 0, {
        id: `fstk_${prod.id}`,
        header: prod.name.split(' ')[0],
        cell: (info) => <StockCell boxes={info.getValue() as number} />,
        sortingFn: 'basic',
      })
    )

    const warehouseStockCols = products.map((prod) =>
      columnHelper.accessor((row) => row.warehouseStock[prod.id] ?? 0, {
        id: `wstk_${prod.id}`,
        header: prod.name.split(' ')[0],
        cell: (info) => <StockCell boxes={info.getValue() as number} />,
        sortingFn: 'basic',
      })
    )

    const productCols = products.map((prod) =>
      columnHelper.accessor((row) => row.products[prod.id]?.boxes ?? 0, {
        id: `prod_${prod.id}`,
        header: prod.name.split(' ')[0],
        cell: (info) => {
          const row = info.row.original
          const b = row.products[prod.id]
          return <ProductCell boxes={b?.boxes ?? 0} value={b?.value ?? 0} />
        },
        sortingFn: 'basic',
      })
    )

    return [
      columnHelper.accessor('date', {
        header: '',
        cell: (info) => (
          <span className="whitespace-nowrap text-sm font-medium text-ink">
            {formatDate(info.getValue())}
          </span>
        ),
        sortingFn: 'text',
      }),
      columnHelper.group({
        header: 'Producido por fábrica',
        columns: productCols,
      }),
      columnHelper.group({
        header: 'Recogido',
        columns: transferCols,
      }),
      columnHelper.group({
        header: 'Vendido',
        columns: saleCols,
      }),
      columnHelper.group({
        header: 'Por recoger',
        columns: factoryStockCols,
      }),
      columnHelper.group({
        header: 'En almacén',
        columns: warehouseStockCols,
      }),
      columnHelper.accessor('payments', {
        header: '',
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
                    colSpan={header.colSpan}
                    className={cn(
                      'cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted transition-colors hover:text-ink',
                      header.colSpan > 1 && 'text-center'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className={cn('flex items-center gap-1.5', header.colSpan > 1 && 'justify-center')}>
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
                  <td key={cell.id} className="whitespace-nowrap px-3 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-b border-hairline bg-ash/50 font-semibold">
              <td className="whitespace-nowrap px-3 py-3 text-sm text-ink">Total</td>
              {products.map((prod) => (
                <td key={prod.id} className="whitespace-nowrap px-3 py-3">
                  <ProductCell
                    boxes={totals.products[prod.id]?.boxes ?? 0}
                    value={totals.products[prod.id]?.value ?? 0}
                  />
                </td>
              ))}
              {products.map((prod) => (
                <td key={prod.id} className="whitespace-nowrap px-3 py-3">
                  <ProductCell
                    boxes={totals.transfers[prod.id]?.boxes ?? 0}
                    value={totals.transfers[prod.id]?.value ?? 0}
                  />
                </td>
              ))}
              {products.map((prod) => (
                <td key={prod.id} className="whitespace-nowrap px-3 py-3">
                  <ProductCell
                    boxes={totals.sales[prod.id]?.boxes ?? 0}
                    value={totals.sales[prod.id]?.value ?? 0}
                  />
                </td>
              ))}
              {products.map((prod) => (
                <td key={prod.id} className="whitespace-nowrap px-3 py-3">
                  <StockCell boxes={totals.factoryStock[prod.id] ?? 0} />
                </td>
              ))}
              {products.map((prod) => (
                <td key={prod.id} className="whitespace-nowrap px-3 py-3">
                  <StockCell boxes={totals.warehouseStock[prod.id] ?? 0} />
                </td>
              ))}
              <td className="whitespace-nowrap px-3 py-3">
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
