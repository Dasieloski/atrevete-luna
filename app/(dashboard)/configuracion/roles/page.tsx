'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Plus, Edit2, Trash2, X, Check, Loader2, Search } from 'lucide-react'
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
  const [form, setForm] = useState<{ name: string; description: string; permissions: Permission[] }>({
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Fusionar permisos existentes con todos los módulos para no perder ninguno
    const mergedPermissions = Object.keys(MODULE_LABELS).map((module) => {
      const existing = role.permissions.find((p) => p.module === module)
      return existing || { module, view: false, create: false, edit: false, delete: false }
    })
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: mergedPermissions,
    })
    setError(null)
    setShowModal(true)
  }

  const togglePermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
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
        p.module === module ? { ...p, view: value, create: value, edit: value, delete: value } : p
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
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Roles y Permisos
          </h1>
          <p className="text-sm text-muted mt-1">
            Define qué puede ver y hacer cada rol en el sistema.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium"
        >
          <Plus className="w-4 h-4" />
          Nuevo rol
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar rol por nombre o descripción..."
              className="w-full pl-9 pr-3 py-2.5 border border-hairline rounded-lg bg-surface-card text-body text-sm"
            />
          </div>

          {filteredRoles.length === 0 ? (
            <div className="bg-surface-card rounded-xl p-12 border border-hairline text-center">
              <Shield className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted">
                {roles.length === 0
                  ? 'No hay roles creados. Crea el primero con el botón superior.'
                  : 'No se encontraron roles con la búsqueda aplicada.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className="bg-surface-card rounded-xl p-5 border border-hairline"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                        {role.name}
                        {role.isSuperAdmin && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            SUPER
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted mt-1">
                        {role.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-soft mt-3 pt-3 border-t border-hairline">
                    {role.isSuperAdmin ? (
                      <span>Acceso total a todos los módulos</span>
                    ) : (
                      <span>
                        {role.permissions.filter((p) => p.view).length} módulos con acceso ·{' '}
                        {role._count?.users ?? 0} usuario(s)
                      </span>
                    )}
                  </div>

                  {!role.isSuperAdmin && (
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => openEdit(role)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-hairline rounded-lg hover:bg-surface-soft text-body"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteId(role.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-hairline rounded-lg hover:bg-error/10 text-error"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de creación/edición */}

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-card rounded-xl border border-hairline w-full max-w-3xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-hairline">
              <h2 className="text-lg font-semibold text-ink">
                {editingRole ? `Editar rol: ${editingRole.name}` : 'Crear nuevo rol'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-surface-soft rounded-lg"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">
                    Nombre del rol *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                    placeholder="Ej: Vendedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                    placeholder="Ej: Solo puede ver y crear ventas"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-body-strong mb-3">Permisos por módulo</h3>
                <div className="border border-hairline rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-soft">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase">Módulo</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-muted uppercase">Ver</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-muted uppercase">Crear</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-muted uppercase">Editar</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-muted uppercase">Eliminar</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-muted uppercase">Todos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.permissions.map((perm) => (
                        <tr key={perm.module} className="border-t border-hairline">
                          <td className="px-3 py-2 text-body font-medium">
                            {MODULE_LABELS[perm.module] || perm.module}
                          </td>
                          {(['view', 'create', 'edit', 'delete'] as const).map((action) => (
                            <td key={action} className="px-2 py-2 text-center">
                              <button
                                onClick={() => togglePermission(perm.module, action)}
                                className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                  perm[action]
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-canvas border border-hairline hover:border-primary'
                                }`}
                              >
                                {perm[action] && <Check className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => {
                                const all = perm.view && perm.create && perm.edit && perm.delete
                                toggleAllForModule(perm.module, !all)
                              }}
                              className="text-2xs px-2 py-1 border border-hairline rounded hover:bg-surface-soft"
                            >
                              Todo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-hairline bg-surface-soft">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-hairline rounded-lg text-body hover:bg-surface-card"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active disabled:opacity-50 font-medium"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingRole ? 'Guardar cambios' : 'Crear rol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-hairline w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-ink mb-2">¿Eliminar este rol?</h2>
            <p className="text-sm text-muted mb-5">
              Esta acción no se puede deshacer. Solo se pueden eliminar roles que no tengan usuarios asignados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 border border-hairline rounded-lg text-body hover:bg-surface-soft"
              >
                Cancelar
              </button>
              <button
                onClick={() => remove(deleteId)}
                className="px-4 py-2.5 bg-error text-on-primary rounded-lg hover:opacity-90 font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
