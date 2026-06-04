'use client'

import { useState } from 'react'
import { Settings, Save, CheckCircle2, Info } from 'lucide-react'

export default function ConfiguracionPage() {
  const [unitsPerBox, setUnitsPerBox] = useState(100)
  const [priceWarehouse, setPriceWarehouse] = useState(0.49)
  const [priceDistribution, setPriceDistribution] = useState(0.54)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Configuración</h1>
        <p className="text-sm text-muted mt-1">
          Ajusta los valores por defecto y consulta información del sistema.
        </p>
      </header>

      <div className="max-w-2xl space-y-6">
        <form onSubmit={handleSave} className="bg-surface-card rounded-xl p-6 border border-hairline">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-ink">Valores por defecto</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">
                Unidades por caja
              </label>
              <input
                type="number"
                min="1"
                value={unitsPerBox}
                onChange={(e) => setUnitsPerBox(parseInt(e.target.value) || 100)}
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body max-w-xs"
              />
              <p className="text-xs text-muted mt-1">Cantidad de unidades que entran en cada caja por defecto. Se usa como referencia al registrar producción y ventas.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">
                Precio almacén (USD / unidad)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceWarehouse}
                onChange={(e) => setPriceWarehouse(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body max-w-xs"
              />
              <p className="text-xs text-muted mt-1">Precio de costo por unidad cuando sale del almacén.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">
                Precio distribución (USD / unidad)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceDistribution}
                onChange={(e) => setPriceDistribution(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body max-w-xs"
              />
              <p className="text-xs text-muted mt-1">Precio de venta por unidad para distribuidores.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-hairline">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium"
            >
              <Save className="w-4 h-4" />
              Guardar configuración
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-success font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Guardado correctamente
              </span>
            )}
          </div>
        </form>

        <div className="bg-surface-card rounded-xl p-6 border border-hairline">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-ink">Información del sistema</h2>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-3 py-1.5">
              <span className="text-muted w-28 shrink-0">Versión</span>
              <span className="font-medium text-body-strong">1.0.0</span>
            </div>
            <div className="flex items-center gap-3 py-1.5 border-t border-hairline/50">
              <span className="text-muted w-28 shrink-0">Base de datos</span>
              <span className="font-medium text-body-strong">PostgreSQL + Prisma</span>
            </div>
            <div className="flex items-center gap-3 py-1.5 border-t border-hairline/50">
              <span className="text-muted w-28 shrink-0">Autenticación</span>
              <span className="font-medium text-body-strong">JWT</span>
            </div>
            <div className="flex items-center gap-3 py-1.5 border-t border-hairline/50">
              <span className="text-muted w-28 shrink-0">Framework</span>
              <span className="font-medium text-body-strong">Next.js 16</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
