'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  ClipboardList,
  Loader2,
  Search,
  Filter,
  AlertCircle,
  User,
  Box,
  Factory,
  ShoppingCart,
  Users,
  DollarSign,
  CreditCard,
  Shield,
  ArrowRightLeft,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Input } from '@/src/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { Badge } from '@/src/components/ui/Badge'
import { EmptyState } from '@/src/components/EmptyState'

interface AuditLog {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entity: string
  entityId: string | null
  entityName: string | null
  details: string | null
  createdAt: string
}

const ENTITY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  user: { label: 'Usuario', icon: User },
  product: { label: 'Producto', icon: Box },
  production: { label: 'Producción', icon: Factory },
  sale: { label: 'Venta', icon: ShoppingCart },
  customer: { label: 'Cliente', icon: Users },
  expense: { label: 'Gasto', icon: DollarSign },
  debt: { label: 'Deuda', icon: CreditCard },
  role: { label: 'Rol', icon: Shield },
  transfer: { label: 'Transferencia', icon: ArrowRightLeft },
}

const ACTION_CONFIG: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'error' }
> = {
  create: { label: 'Creó', tone: 'success' },
  edit: { label: 'Editó', tone: 'warning' },
  delete: { label: 'Eliminó', tone: 'error' },
}

export default function AuditoriaPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('limit', String(LIMIT))
      params.set('offset', String(offset))
      if (entityFilter) params.set('entity', entityFilter)
      if (actionFilter) params.set('action', actionFilter)

      const res = await fetch(`/api/audit?${params.toString()}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
      }
    } catch {
      console.error('Error al cargar auditoría')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      void fetchLogs()
    }
  }, [authLoading, user, entityFilter, actionFilter, offset])

  const filteredLogs = useMemo(() => {
    if (!search) return logs
    const s = search.toLowerCase()
    return logs.filter((l) => {
      const matchUser = l.userName?.toLowerCase().includes(s)
      const matchEntity = l.entityName?.toLowerCase().includes(s)
      const matchDetail = l.details?.toLowerCase().includes(s)
      return matchUser || matchEntity || matchDetail
    })
  }, [logs, search])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  if (!user?.role.isSuperAdmin) {
    return (
      <div className="ts-card-pad max-w-md">
        <h2 className="mb-2 text-base font-medium text-ink">
          Acceso restringido
        </h2>
        <p className="text-sm text-muted">
          Solo el superadministrador puede ver la auditoría del sistema.
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Auditoría"
        description="Registro de todas las acciones de creación, edición y eliminación realizadas en el sistema."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuario, entidad o detalle…"
          leadingIcon={<Search className="h-3.5 w-3.5" />}
          className="max-w-md"
        />
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted" />
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value)
              setOffset(0)
            }}
            className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink hover:border-pewter focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todas las entidades</option>
            {Object.entries(ENTITY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setOffset(0)
            }}
            className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink hover:border-pewter focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todas las acciones</option>
            <option value="create">Creación</option>
            <option value="edit">Edición</option>
            <option value="delete">Eliminación</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            logs.length === 0
              ? 'Sin registros de auditoría'
              : 'Sin coincidencias'
          }
          description={
            logs.length === 0
              ? 'Aún no se han registrado acciones en el sistema.'
              : 'No se encontraron registros con los filtros aplicados.'
          }
        />
      ) : (
        <section className="ts-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="w-40">Fecha</TH>
                  <TH>Usuario</TH>
                  <TH>Acción</TH>
                  <TH>Entidad</TH>
                  <TH>Nombre</TH>
                  <TH>Detalles</TH>
                </TR>
              </THead>
              <TBody>
                {filteredLogs.map((log) => {
                  const entityCfg = ENTITY_CONFIG[log.entity] || {
                    label: log.entity,
                    icon: Box,
                  }
                  const actionCfg = ACTION_CONFIG[log.action] || {
                    label: log.action,
                    tone: 'neutral' as const,
                  }
                  const EntityIcon = entityCfg.icon
                  const ActionIcon =
                    log.action === 'create'
                      ? Plus
                      : log.action === 'edit'
                        ? Pencil
                        : Trash2

                  return (
                    <TR key={log.id}>
                      <TD>
                        <span className="text-xs text-muted">
                          {new Date(log.createdAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </TD>
                      <TD>
                        <span className="text-sm font-medium text-ink">
                          {log.userName || '—'}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone={actionCfg.tone}>
                          <ActionIcon className="h-3 w-3" />
                          {actionCfg.label}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1.5 text-sm text-muted">
                          <EntityIcon className="h-3.5 w-3.5" />
                          {entityCfg.label}
                        </div>
                      </TD>
                      <TD>
                        <span className="text-sm text-ink">
                          {log.entityName || '—'}
                        </span>
                      </TD>
                      <TD>
                        {log.details ? (
                          <pre className="max-w-xs truncate text-xs text-muted">
                            {log.details}
                          </pre>
                        ) : (
                          <span className="text-xs text-muted-soft">—</span>
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-hairline px-5 py-3 sm:px-6">
            <span className="text-xs text-muted">
              {total} registro{total !== 1 ? 's' : ''} total
              {total !== filteredLogs.length
                ? ` • ${filteredLogs.length} mostrados`
                : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset((prev) => Math.max(0, prev - LIMIT))}
                className="ts-btn-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-muted">
                Página {currentPage} de {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={offset + LIMIT >= total}
                onClick={() => setOffset((prev) => prev + LIMIT)}
                className="ts-btn-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
