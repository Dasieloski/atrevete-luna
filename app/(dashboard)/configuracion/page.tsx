'use client'

import { useState } from 'react'
import { Settings, Save, CheckCircle2, Info, Database, KeyRound, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'

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
      <PageHeader
        eyebrow="Administración"
        title="Configuración"
        description="Ajusta los valores por defecto y consulta información del sistema."
      />

      <div className="max-w-2xl space-y-6">
        <form onSubmit={handleSave} className="ts-card-pad">
          <div className="mb-6 flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-base font-medium text-ink">Valores por defecto</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="ts-label">Unidades por caja</label>
              <Input
                type="number"
                min="1"
                value={unitsPerBox}
                onChange={(e) => setUnitsPerBox(parseInt(e.target.value) || 100)}
                className="max-w-xs"
              />
              <p className="mt-1.5 text-xs text-muted">
                Cantidad de unidades que entran en cada caja por defecto. Se usa
                como referencia al registrar producción y ventas.
              </p>
            </div>

            <div>
              <label className="ts-label">Precio almacén</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceWarehouse}
                onChange={(e) =>
                  setPriceWarehouse(parseFloat(e.target.value) || 0)
                }
                className="max-w-xs"
              />
              <p className="mt-1.5 text-xs text-muted">
                Precio de costo por unidad cuando sale del almacén.
              </p>
            </div>

            <div>
              <label className="ts-label">Precio distribución</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceDistribution}
                onChange={(e) =>
                  setPriceDistribution(parseFloat(e.target.value) || 0)
                }
                className="max-w-xs"
              />
              <p className="mt-1.5 text-xs text-muted">
                Precio de venta por unidad para distribuidores.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 border-t border-hairline pt-4">
            <Button
              type="submit"
              leadingIcon={<Save className="h-4 w-4" />}
            >
              Guardar configuración
            </Button>
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-success"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Guardado correctamente
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>

        <section className="ts-card-pad">
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-pewter" />
            <h2 className="text-base font-medium text-ink">
              Información del sistema
            </h2>
          </div>
          <dl className="divide-y divide-hairline text-sm">
            <InfoRow icon={<Layers className="h-4 w-4" />} label="Versión" value="1.0.0" />
            <InfoRow
              icon={<Database className="h-4 w-4" />}
              label="Base de datos"
              value="PostgreSQL + Prisma"
            />
            <InfoRow
              icon={<KeyRound className="h-4 w-4" />}
              label="Autenticación"
              value="JWT"
            />
            <InfoRow
              icon={<Layers className="h-4 w-4" />}
              label="Framework"
              value="Next.js 16"
            />
          </dl>
        </section>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-pewter">{icon}</span>
      <span className="w-28 shrink-0 text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}
