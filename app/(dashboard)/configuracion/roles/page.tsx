'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Plus, Edit2, Trash2, X, Check, Loader2, Search, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { Badge } from '@/src/components/ui/Badge'
import { cn } from '@/src/lib/utils'
import type { AppModule } from '@/lib/permissions'

interface Permission {
  id?: string
  module: AppModule | string
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

interface Role {
  id: string
  name: string
  description: string | null
  isSuperAdmin: boolean
  permissions: Permission[]
  _count?: { users: number }
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Tablero',
  ventas: 'Ventas',
  productos: 'Productos',
  almacen: 'Almacén',
  produccion: 'Producción',
  clientes: 'Clientes',
  deudas: 'Deudas',
  gastos: 'Gastos',
  marketing: 'Marketing',
  estadisticas: 'Estadísticas',
  configuracion: 'Configuración',
  roles: 'Roles y Permisos',
  usuarios: 'Usuarios',
}

export default function RolesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState<{
    name: string
    description: string
    permissions: Permission[]
  }>({
    name: '',
    description: '',
    permissions: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles
    const s = search.toLowerCase()
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.description || '').toLowerCase().includes(s)
    )
  }, [roles, search])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data.roles)
      }
    } catch {
      console.error('Error al cargar roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      void fetchRoles()
    }
  }, [authLoading, user])

  const openNew = () => {
    setEditingRole(null)
    setForm({
      name: '',
      description: '',
      permissions: Object.keys(MODULE_LABELS).map((module) => ({
        module,
        view: false,
        create: false,
        edit: false,
        delete: false,
      })),
    })
    setError(null)
    setShowModal(true)
  }

  const openEdit = (role: Role) => {
    setEditingRole(role)
    const mergedPermissions = Object.keys(MODULE_LABELS).map((module) => {
      const existing = role.permissions.find((p) => p.module === module)
      return (
        existing || {
          module,
          view: false,
          create: false,
          edit: false,
          delete: false,
        }
      )
    })
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: mergedPermissions,
    })
    setError(null)
    setShowModal(true)
  }

  const togglePermission = (
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete'
  ) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.module === module ? { ...p, [action]: !p[action] } : p
      ),
    }))
  }

  const toggleAllForModule = (module: string, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.module === module
          ? { ...p, view: value, create: value, edit: value, delete: value }
          : p
      ),
    }))
  }

  const save = async () => {
    setError(null)
    if (!form.name.trim()) {
      setError('El nombre del rol es obligatorio')
      return
    }
    setSaving(true)
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles'
      const method = editingRole ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        await fetchRoles()
        setShowModal(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
      }
    } catch {
      setError('Error al guardar el rol')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchRoles()
        setDeleteId(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar')
      }
    } catch {
      alert('Error al eliminar el rol')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Roles y permisos"
        description="Define qué puede ver y hacer cada rol en el sistema."
        actions={
          <Button
            onClick={openNew}
            leadingIcon={<Plus className="h-4 w-4" />}
          >
            Nuevo rol
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar rol por nombre o descripción…"
              leadingIcon={<Search className="h-3.5 w-3.5" />}
              className="max-w-md"
            />
          </div>

          {filteredRoles.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={
                roles.length === 0
                  ? 'No hay roles creados'
                  : 'Sin coincidencias'
              }
              description={
                roles.length === 0
                  ? 'Crea el primer rol con el botón superior.'
                  : 'No se encontraron roles con la búsqueda aplicada.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.map((role) => (
                <motion.div
                  key={role.id}
                  layout
                  className="ts-card-pad"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
                        <span className="truncate">{role.name}</span>
                        {role.isSuperAdmin && (
                          <Badge tone="primary" className="shrink-0">
                            SUPER
                          </Badge>
                        )}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {role.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-hairline pt-3 text-xs text-muted-soft">
                    {role.isSuperAdmin ? (
                      <span>Acceso total a todos los módulos</span>
                    ) : (
                      <span>
                        {role.permissions.filter((p) => p.view).length} módulos
                        con acceso · {role._count?.users ?? 0} usuario(s)
                      </span>
                    )}
                  </div>

                  {!role.isSuperAdmin && (
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEdit(role)}
                        leadingIcon={<Edit2 className="h-3.5 w-3.5" />}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeleteId(role.id)}
                        className="text-error hover:bg-error-soft"
                        leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                      >
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal
            open
            size="xl"
            title={editingRole ? `Editar rol: ${editingRole.name}` : 'Crear nuevo rol'}
            onClose={() => setShowModal(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={save} loading={saving}>
                  {editingRole ? 'Guardar cambios' : 'Crear rol'}
                </Button>
              </>
            }
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="ts-label">Nombre del rol *</label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Vendedor"
                  />
                </div>
                <div>
                  <label className="ts-label">Descripción</label>
                  <Input
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Ej: Solo puede ver y crear ventas"
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-ink">
                  Permisos por módulo
                </h3>
                <div className="overflow-hidden rounded-md border border-hairline">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-ash/60 text-[11px] uppercase tracking-wider text-pewter">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">
                            Módulo
                          </th>
                          {(
                            ['view', 'create', 'edit', 'delete'] as const
                          ).map((a) => (
                            <th
                              key={a}
                              className="px-2 py-2 text-center font-semibold"
                            >
                              {a === 'view'
                                ? 'Ver'
                                : a === 'create'
                                ? 'Crear'
                                : a === 'edit'
                                ? 'Editar'
                                : 'Eliminar'}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-center font-semibold">
                            Todos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.permissions.map((perm) => {
                          const all =
                            perm.view &&
                            perm.create &&
                            perm.edit &&
                            perm.delete
                          return (
                            <tr
                              key={perm.module}
                              className="border-t border-hairline"
                            >
                              <td className="px-3 py-2 font-medium text-ink">
                                {MODULE_LABELS[perm.module] || perm.module}
                              </td>
                              {(
                                ['view', 'create', 'edit', 'delete'] as const
                              ).map((action) => (
                                <td key={action} className="px-2 py-2 text-center">
                                  <button
                                    onClick={() =>
                                      togglePermission(perm.module, action)
                                    }
                                    className={cn(
                                      'inline-flex h-6 w-6 items-center justify-center rounded transition-colors',
                                      perm[action]
                                        ? 'bg-primary text-white'
                                        : 'border border-hairline-strong bg-canvas hover:border-primary'
                                    )}
                                    aria-label={`${action} ${MODULE_LABELS[perm.module]}`}
                                  >
                                    {perm[action] && (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center">
                                <button
                                  onClick={() =>
                                    toggleAllForModule(perm.module, !all)
                                  }
                                  className="rounded border border-hairline-strong px-2 py-1 text-[11px] font-medium text-graphite hover:bg-ash"
                                >
                                  {all ? 'Quitar' : 'Todo'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md bg-error-soft px-3 py-2 text-sm text-error">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <Modal
        open={deleteId !== null}
        title="¿Eliminar este rol?"
        subtitle="Esta acción no se puede deshacer. Solo se pueden eliminar roles que no tengan usuarios asignados."
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteId && remove(deleteId)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Confirma que quieres eliminar el rol seleccionado. Los usuarios con
          este rol asignado perderán sus permisos.
        </p>
      </Modal>
    </div>
  )
}
