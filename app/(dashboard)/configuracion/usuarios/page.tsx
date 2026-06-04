'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Search,
  Shield,
  AlertCircle,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { Badge } from '@/src/components/ui/Badge'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'

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
      void fetchData()
    }
  }, [authLoading, user])

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
          Solo el superadministrador puede gestionar usuarios.
        </p>
      </div>
    )
  }

  const openNew = () => {
    setEditingUser(null)
    setForm({
      email: '',
      password: '',
      name: '',
      roleId:
        roles.find((r) => !r.isSuperAdmin)?.id || roles[0]?.id || '',
    })
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
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Crea usuarios y asígnales un rol para controlar sus permisos."
        actions={
          <Button
            onClick={openNew}
            leadingIcon={<Plus className="h-4 w-4" />}
          >
            Nuevo usuario
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          leadingIcon={<Search className="h-3.5 w-3.5" />}
          className="max-w-md"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink hover:border-pewter focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title={
            users.length === 0
              ? 'No hay usuarios registrados'
              : 'Sin coincidencias'
          }
          description={
            users.length === 0
              ? 'Crea el primer usuario con el botón superior.'
              : 'No se encontraron usuarios con los filtros aplicados.'
          }
        />
      ) : (
        <section className="ts-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Email</TH>
                  <TH>Rol</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {filteredUsers.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{u.name}</span>
                        {u.id === user.id && (
                          <Badge tone="neutral" className="shrink-0">
                            TÚ
                          </Badge>
                        )}
                      </div>
                    </TD>
                    <TD className="text-muted">{u.email}</TD>
                    <TD>
                      {u.role.isSuperAdmin ? (
                        <Badge tone="primary">
                          <Shield className="h-3 w-3" />
                          {u.role.name}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">{u.role.name}</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="ts-btn-icon"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="ts-btn-icon hover:bg-error-soft hover:text-error"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <div className="border-t border-hairline px-5 py-2.5 text-xs text-muted-soft sm:px-6">
            {filteredUsers.length} de {users.length} usuario
            {users.length !== 1 ? 's' : ''}
          </div>
        </section>
      )}

      <Modal
        open={showModal}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {editingUser?.id === user.id && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Estás editando tu propio usuario. Ten cuidado al cambiar tu rol.
              </span>
            </div>
          )}

          <div>
            <label className="ts-label">Nombre completo *</label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Juan Pérez"
              leadingIcon={<UserIcon className="h-4 w-4" />}
            />
          </div>
          <div>
            <label className="ts-label">Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@ejemplo.com"
              leadingIcon={<Mail className="h-4 w-4" />}
            />
          </div>
          <div>
            <label className="ts-label">
              Contraseña{' '}
              {editingUser && (
                <span className="text-muted-soft normal-case tracking-normal">
                  (dejar vacía para no cambiar)
                </span>
              )}{' '}
              *
            </label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              leadingIcon={<Lock className="h-4 w-4" />}
            />
          </div>
          <div>
            <label className="ts-label">Rol *</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className="ts-input"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isSuperAdmin && '— Acceso total'}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-error-soft px-3 py-2 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={deleteId !== null}
        title="¿Eliminar este usuario?"
        subtitle="Esta acción no se puede deshacer. El usuario no podrá volver a iniciar sesión."
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
              Eliminar usuario
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Confirma que quieres eliminar al usuario seleccionado.
        </p>
      </Modal>
    </div>
  )
}
