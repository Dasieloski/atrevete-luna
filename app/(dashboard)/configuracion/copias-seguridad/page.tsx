'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Download,
  Upload,
  Shield,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileArchive,
  Calendar,
  Clock,
  User,
  Table2,
  Database,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileUp,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/src/components/ui/Card'
import { cn } from '@/src/lib/utils'

type StatusType = 'idle' | 'generating' | 'success' | 'error'
type RestoreStep = 'idle' | 'uploading' | 'preview' | 'confirming' | 'restoring' | 'done' | 'error'

interface BackupPreview {
  metadata: {
    appName: string
    version: string
    createdAt: string
    createdBy: string
    tableCount: number
    tables: string[]
  }
  recordsPerTable: Record<string, number>
  totalRecords: number
}

const ENTITY_LABELS: Record<string, string> = {
  Role: 'Roles',
  Permission: 'Permisos',
  User: 'Usuarios',
  Product: 'Productos',
  Customer: 'Clientes',
  Sale: 'Ventas',
  Production: 'Producción',
  WarehouseStock: 'Stock Almacén',
  Transfer: 'Transferencias',
  Waste: 'Mermas',
  Expense: 'Gastos',
  Marketing: 'Marketing',
  Event: 'Eventos',
  Debt: 'Deudas',
  DebtPayment: 'Pagos Deudas',
  Reservation: 'Reservas',
  SystemConfig: 'Configuración',
  AuditLog: 'Auditoría',
  Payment: 'Pagos',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function getEntityLabel(table: string) {
  return ENTITY_LABELS[table] || table
}

export default function BackupPage() {
  const [genStatus, setGenStatus] = useState<StatusType>('idle')
  const [genError, setGenError] = useState('')
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('idle')
  const [restoreError, setRestoreError] = useState('')
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [expandedTables, setExpandedTables] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [restoreProgress, setRestoreProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleGenerate() {
    setGenStatus('generating')
    setGenError('')
    setGenProgress(0)

    const progressInterval = setInterval(() => {
      setGenProgress((p) => Math.min(p + Math.random() * 20, 90))
    }, 300)

    try {
      const res = await fetch('/api/backup/generate', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al generar backup')
      }

      setGenProgress(100)
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?(.+?)"?$/)
      const filename = match?.[1] || `backup-${new Date().toISOString().slice(0, 16).replace('T', '-')}.zip`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setGenStatus('success')
      setTimeout(() => setGenStatus('idle'), 3000)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Error del servidor')
      setGenStatus('error')
    } finally {
      clearInterval(progressInterval)
    }
  }

  function handleFileSelect(file: File) {
    if (!file.name.endsWith('.zip')) {
      setRestoreError('El archivo debe tener extensión .zip')
      setRestoreStep('error')
      return
    }

    setRestoreStep('uploading')
    setRestoreError('')
    setPreview(null)
    setFileInfo({ name: file.name, size: file.size })
    setExpandedTables(false)

    file.arrayBuffer().then(async (buffer) => {
      setFileBuffer(buffer)

      const formData = new FormData()
      formData.set('file', file)

      try {
        const res = await fetch('/api/backup/restore/preview', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Error al validar backup')
        }

        const data = await res.json()
        setPreview(data.preview)
        setRestoreStep('preview')
      } catch (err) {
        setRestoreError(err instanceof Error ? err.message : 'Error al validar el archivo')
        setRestoreStep('error')
      }
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRestore() {
    if (!fileBuffer || !fileInfo) return

    setRestoreStep('restoring')
    setRestoreError('')
    setRestoreProgress(0)

    const progressInterval = setInterval(() => {
      setRestoreProgress((p) => Math.min(p + Math.random() * 15, 85))
    }, 400)

    try {
      const file = new File([fileBuffer], fileInfo.name, { type: 'application/zip' })
      const formData = new FormData()
      formData.set('file', file)

      const res = await fetch('/api/backup/restore/execute', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al restaurar backup')
      }

      setRestoreProgress(100)
      setRestoreStep('done')
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Error durante la restauración')
      setRestoreStep('error')
    } finally {
      clearInterval(progressInterval)
    }
  }

  function handleReset() {
    setRestoreStep('idle')
    setRestoreError('')
    setPreview(null)
    setFileInfo(null)
    setFileBuffer(null)
    setExpandedTables(false)
    setRestoreProgress(0)
  }

  const tableEntries = preview
    ? Object.entries(preview.recordsPerTable).sort(([, a], [, b]) => b - a)
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Copias de Seguridad"
        description="Genera respaldos completos de la base de datos y restáuralos cuando sea necesario."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generar Backup</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HardDrive className="h-6 w-6" />
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-ink">
                  Exporta todos los datos del sistema en un archivo ZIP con formato JSON estructurado.
                </p>
                <ul className="space-y-1 text-xs text-slate">
                  <li className="flex items-center gap-1.5">
                    <Database className="h-3 w-3" />
                    Incluye todas las tablas y registros actuales
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Fecha, versión del sistema y metadatos completos
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3" />
                    Acceso exclusivo para administradores
                  </li>
                </ul>
              </div>
            </div>

            {genStatus === 'generating' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Generando backup...</span>
                  <span>{Math.round(genProgress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${genProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            <AnimatePresence>
              {genStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm font-medium text-success"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Backup generado y descargado correctamente
                </motion.div>
              )}
              {genStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm font-medium text-coral"
                >
                  <XCircle className="h-4 w-4" />
                  {genError}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleGenerate}
              loading={genStatus === 'generating'}
              leadingIcon={<Download className="h-4 w-4" />}
              fullWidth
            >
              {genStatus === 'generating' ? 'Generando...' : 'Generar Backup'}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restaurar Backup</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-canary/20 text-canary-dark">
                <Upload className="h-6 w-6" />
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-ink">
                  Restaura una copia de seguridad completa.
                </p>
                <ul className="space-y-1 text-xs text-slate">
                  <li className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Esta acción reemplazará todos los datos actuales
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Validación automática de integridad
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3" />
                    Restauración atómica con transacciones
                  </li>
                </ul>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {restoreStep === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div
                    ref={dropRef}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                      dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-hairline-strong hover:border-stone hover:bg-surface'
                    )}
                  >
                    <FileArchive className={cn('h-8 w-8', dragOver ? 'text-primary' : 'text-steel')} />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-ink">
                        {dragOver ? 'Suelta el archivo aquí' : 'Selecciona o arrastra un archivo'}
                      </p>
                      <p className="text-xs text-muted">Archivo .zip de backup</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </motion.div>
              )}

              {(restoreStep === 'uploading' || restoreStep === 'preview') && preview && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-lg border border-hairline-strong bg-surface/50 p-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone">
                      Información del Backup
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-ink">
                        <FileArchive className="h-4 w-4 text-steel" />
                        <span className="text-muted">Archivo:</span>
                        <span className="font-medium">{fileInfo?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink">
                        <Calendar className="h-4 w-4 text-steel" />
                        <span className="text-muted">Creado:</span>
                        <span className="font-medium">{formatDate(preview.metadata.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink">
                        <User className="h-4 w-4 text-steel" />
                        <span className="text-muted">Por:</span>
                        <span className="font-medium">{preview.metadata.createdBy}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink">
                        <Database className="h-4 w-4 text-steel" />
                        <span className="text-muted">Versión:</span>
                        <span className="font-medium">{preview.metadata.version}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink">
                        <Table2 className="h-4 w-4 text-steel" />
                        <span className="text-muted">Registros:</span>
                        <span className="font-medium">
                          {preview.totalRecords.toLocaleString('es-ES')} en {preview.metadata.tableCount} tablas
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-hairline-strong bg-surface/50 p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedTables(!expandedTables)}
                      className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone"
                    >
                      <span>Registros por Tabla ({preview.metadata.tableCount})</span>
                      {expandedTables ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedTables && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 space-y-1 overflow-hidden"
                        >
                          {tableEntries.map(([table, count]) => (
                            <div
                              key={table}
                              className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-surface"
                            >
                              <span className="text-ink">{getEntityLabel(table)}</span>
                              <span className="font-mono text-xs text-slate">
                                {count.toLocaleString('es-ES')}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {restoreStep === 'preview' && (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        onClick={handleRestore}
                        leadingIcon={<AlertTriangle className="h-4 w-4" />}
                        fullWidth
                      >
                        Restaurar Backup
                      </Button>
                      <Button variant="secondary" onClick={handleReset}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {restoreStep === 'restoring' && (
                <motion.div
                  key="restoring"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Restaurando datos...</span>
                    <span>{Math.round(restoreProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <motion.div
                      className="h-full rounded-full bg-canary-dark"
                      initial={{ width: 0 }}
                      animate={{ width: `${restoreProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Validando y restaurando en una transacción segura...
                  </div>
                </motion.div>
              )}

              {restoreStep === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-4 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-ink">Restauración completada</p>
                    <p className="text-sm text-slate">
                      Se restauraron {preview?.totalRecords.toLocaleString('es-ES')} registros en{' '}
                      {preview?.metadata.tableCount} tablas correctamente.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleReset}>
                    Restaurar otro backup
                  </Button>
                </motion.div>
              )}

              {restoreStep === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3 rounded-lg border border-coral/20 bg-coral/5 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-coral" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-coral">Error</p>
                      <p className="text-xs text-slate">{restoreError}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleReset} fullWidth>
                      Intentar de nuevo
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
