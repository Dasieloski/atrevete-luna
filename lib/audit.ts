import { prisma } from './prisma'

export type AuditAction = 'create' | 'edit' | 'delete'
export type AuditEntity =
  | 'user'
  | 'product'
  | 'sale'
  | 'production'
  | 'customer'
  | 'expense'
  | 'debt'
  | 'role'
  | 'transfer'

interface LogAuditOptions {
  userId?: string
  userName?: string
  action: AuditAction
  entity: AuditEntity
  entityId?: string
  entityName?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

export async function logAudit(opts: LogAuditOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        userName: opts.userName,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        entityName: opts.entityName,
        details: opts.details ? JSON.stringify(opts.details) : null,
        ipAddress: opts.ipAddress,
      },
    })
  } catch (err) {
    console.error('Audit log error:', err)
  }
}

export async function getAuditLogs(options?: {
  action?: AuditAction
  entity?: AuditEntity
  userId?: string
  limit?: number
  offset?: number
  from?: Date
  to?: Date
}) {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const where: any = {}
  if (options?.action) where.action = options.action
  if (options?.entity) where.entity = options.entity
  if (options?.userId) where.userId = options.userId
  if (options?.from || options?.to) {
    where.createdAt = {}
    if (options.from) where.createdAt.gte = options.from
    if (options.to) where.createdAt.lte = options.to
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total }
}
