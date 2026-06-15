import { prisma } from './prisma'
import AdmZip from 'adm-zip'

export interface BackupMetadata {
  appName: string
  version: string
  createdAt: string
  createdBy: string
  tableCount: number
  tables: string[]
}

export interface BackupManifest {
  metadata: BackupMetadata
  data: Record<string, unknown[]>
}

export interface BackupPreview {
  valid: boolean
  metadata: BackupMetadata
  recordsPerTable: Record<string, number>
  totalRecords: number
}

const APP_NAME = 'Atrévete Luna'
const APP_VERSION = '1.0.0'

async function getTableNames(): Promise<string[]> {
  const result = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  )
  return result.map((r) => r.table_name)
}

async function getForeignKeyGraph(): Promise<Map<string, string[]>> {
  const result = await prisma.$queryRawUnsafe<
    { table_name: string; referenced_table_name: string }[]
  >(
    `SELECT
       tc.table_name,
       ccu.table_name AS referenced_table_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND ccu.table_schema = 'public'`
  )
  const graph = new Map<string, string[]>()
  for (const row of result) {
    const deps = graph.get(row.table_name) || []
    deps.push(row.referenced_table_name)
    graph.set(row.table_name, deps)
    if (!graph.has(row.referenced_table_name)) {
      graph.set(row.referenced_table_name, [])
    }
  }
  return graph
}

function topologicalSort(
  tables: string[],
  graph: Map<string, string[]>
): string[] {
  const visited = new Set<string>()
  const result: string[] = []

  function visit(table: string, path: Set<string>) {
    if (path.has(table)) return
    if (visited.has(table)) return
    path.add(table)
    const deps = graph.get(table) || []
    for (const dep of deps) {
      if (tables.includes(dep)) {
        visit(dep, path)
      }
    }
    path.delete(table)
    visited.add(table)
    result.push(table)
  }

  for (const table of tables) {
    if (!visited.has(table)) {
      visit(table, new Set())
    }
  }

  return result
}

export async function generateBackupZip(userName: string): Promise<{
  buffer: Buffer
  filename: string
}> {
  const tables = await getTableNames()

  const data: Record<string, unknown[]> = {}
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`)
    data[table] = rows as unknown[]
  }

  const manifest: BackupManifest = {
    metadata: {
      appName: APP_NAME,
      version: APP_VERSION,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      tableCount: tables.length,
      tables,
    },
    data,
  }

  const zip = new AdmZip()
  zip.addFile('backup.json', Buffer.from(JSON.stringify(manifest, null, 2)))

  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const filename = `backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.zip`

  return { buffer: zip.toBuffer(), filename }
}

export async function validateBackup(
  buffer: Buffer
): Promise<{ valid: boolean; error?: string; preview?: BackupPreview }> {
  try {
    const zip = new AdmZip(buffer)
    const entry = zip.getEntry('backup.json')
    if (!entry) {
      return { valid: false, error: 'Archivo de backup inválido: no se encontró backup.json en el ZIP' }
    }

    const content = entry.getData().toString('utf-8')
    let manifest: BackupManifest
    try {
      manifest = JSON.parse(content)
    } catch {
      return { valid: false, error: 'Archivo de backup corrupto: el JSON no es válido' }
    }

    if (!manifest.metadata || !manifest.data) {
      return { valid: false, error: 'Estructura de backup inválida: faltan metadatos o datos' }
    }

    if (!manifest.metadata.appName || !manifest.metadata.createdAt) {
      return { valid: false, error: 'Metadatos de backup incompletos' }
    }

    const recordsPerTable: Record<string, number> = {}
    let totalRecords = 0
    for (const [table, rows] of Object.entries(manifest.data)) {
      const count = Array.isArray(rows) ? rows.length : 0
      recordsPerTable[table] = count
      totalRecords += count
    }

    return {
      valid: true,
      preview: {
        valid: true,
        metadata: manifest.metadata,
        recordsPerTable,
        totalRecords,
      },
    }
  } catch (err) {
    return {
      valid: false,
      error: `Error al procesar el archivo: ${err instanceof Error ? err.message : 'Error desconocido'}`,
    }
  }
}

export async function restoreBackup(
  buffer: Buffer
): Promise<{ success: boolean; error?: string; restoredTables?: string[]; totalRecords?: number }> {
  const validation = await validateBackup(buffer)
  if (!validation.valid || !validation.preview) {
    return { success: false, error: validation.error || 'Backup inválido' }
  }

  const manifest = parseManifest(buffer)
  if (!manifest) {
    return { success: false, error: 'No se pudo parsear el manifiesto del backup' }
  }

  const tables = Object.keys(manifest.data)

  try {
    const fkGraph = await getForeignKeyGraph()
    const insertOrder = topologicalSort(tables, fkGraph)
    const deleteOrder = [...insertOrder].reverse()

    let totalRestored = 0

    await prisma.$transaction(async (tx) => {
      for (const table of deleteOrder) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table}"`)
      }

      for (const table of insertOrder) {
        const rows = manifest.data[table]
        if (!Array.isArray(rows) || rows.length === 0) continue

        const columns = Object.keys(rows[0] as Record<string, unknown>)
        const quotedColumns = columns.map((c) => `"${c}"`).join(', ')
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')

        const batchSize = 100
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize)
          for (const row of batch) {
            const values = columns.map((c) => (row as Record<string, unknown>)[c] ?? null)
            await tx.$executeRawUnsafe(
              `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`,
              ...values
            )
          }
          totalRestored += batch.length
        }
      }
    })

    return {
      success: true,
      restoredTables: insertOrder,
      totalRecords: totalRestored,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido durante la restauración'
    return { success: false, error: message }
  }
}

function parseManifest(buffer: Buffer): BackupManifest | null {
  try {
    const zip = new AdmZip(buffer)
    const entry = zip.getEntry('backup.json')
    if (!entry) return null
    const content = entry.getData().toString('utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}
