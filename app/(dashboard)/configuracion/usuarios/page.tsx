'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { UserCog, Plus, Edit2, Trash2, X, Loader2, Search, Shield, AlertCircle } from 'lucide-react'

interface Role {
  id: string
  name: string
  isSuperAdmin: boolean
}

interface User {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
}

export default function UsuariosPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    roleId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/users', { credentials: 'include' }),
        fetch('/api/roles', { credentials: 'include' }),
      ])
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users)
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json()
        setRoles(data.roles)
      }
    } catch {
      console.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchData()
    }
  }, [authLoading, user])

  // Filtrar usuarios según búsqueda y rol
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      const matchRole = !roleFilter || u.role.id === roleFilter
      return matchSearch && matchRole
    })
  }, [users, search, roleFilter])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    )
  }

  if (!user?.role.isSuperAdmin) {
    return (
      <div className="bg-surface-card rounded-xl p-8 border border-hairline max-w-md">
        <h2 className="text-lg font-semibold text-ink mb-2">Acceso restringido</h2>
        <p className="text-sm text-muted">
          Solo el superadministrador puede gestionar usuarios.
        </p>
      </div>
    )
  }

  const openNew = () => {
    setEditingUser(null)
    setForm({ email: '', password: '', name: '', roleId: roles.find((r) => !r.isSuperAdmin)?.id || roles[0]?.id || '' })
    setError(null)
    setShowModal(true)
  }

  const openEdit = (u: User) => {
    setEditingUser(u)
    setForm({
      email: u.email,
      password: '',
      name: u.name,
      roleId: u.role.id,
    })
    setError(null)
    setShowModal(true)
  }

  const save = async () => {
    setError(null)
    if (!form.email || !form.name || !form.roleId) {
      setError('Email, nombre y rol son obligatorios')
      return
    }
    if (!editingUser && !form.password) {
      setError('La contraseña es obligatoria para nuevos usuarios')
      return
    }
    if (form.password && form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setSaving(true)
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (res.ok) {
        await fetchData()
        setShowModal(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
      }
    } catch {
      setError('Error al guardar el usuario')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        await fetchData()
        setDeleteId(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar')
      }
    } catch {
      alert('Error al eliminar el usuario')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" />
            Usuarios
          </h1>
          <p className="text-sm text-muted mt-1">
            Crea usuarios y asígnales un rol para controlar sus permisos.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium"
        >
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </header>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-3 py-2.5 border border-hairline rounded-lg bg-surface-card text-body text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 border border-hairline rounded-lg bg-surface-card text-body text-sm"
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-surface-card rounded-xl p-12 border border-hairline text-center">
          <UserCog className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            {users.length === 0
              ? 'No hay usuarios registrados todavía.'
              : 'No se encontraron usuarios con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Rol</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-t border-hairline hover:bg-surface-soft/50">
                  <td className="px-4 py-3 text-body font-medium">
                    <div className="flex items-center gap-2">
                      {u.name}
                      {u.id === user.id && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-soft text-muted font-medium">
                          TÚ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded ${
                        u.role.isSuperAdmin
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface-soft text-body'
                      }`}
                    >
                      {u.role.isSuperAdmin && <Shield className="w-3 h-3" />}
                      {u.role.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 hover:bg-surface-soft rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-muted" />
                      </button>
                      {u.id !== user.id && (
                        <button
                          onClick={() => setDeleteId(u.id)}
                          className="p-1.5 hover:bg-error/10 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 bg-surface-soft border-t border-hairline text-xs text-muted">
            {filteredUsers.length} de {users.length} usuario{users.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-hairline w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-hairline">
              <h2 className="text-lg font-semibold text-ink">
                {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-surface-soft rounded-lg"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {editingUser?.id === user.id && (
                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Estás editando tu propio usuario. Ten cuidado al cambiar tu rol.</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">
                  Contraseña {editingUser && <span className="text-muted font-normal">(dejar vacía para no cambiar)</span>} *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">
                  Rol *
                </label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isSuperAdmin && '— Acceso total'}
                    </option>
                  ))}
                </select>
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
                {editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-hairline w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-ink mb-2">¿Eliminar este usuario?</h2>
            <p className="text-sm text-muted mb-5">
              Esta acción no se puede deshacer. El usuario no podrá volver a iniciar sesión.
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
                Eliminar usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
