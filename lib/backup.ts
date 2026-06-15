import { prisma } from './prisma'
import { deflateSync, inflateSync } from 'zlib'

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

// ── ZIP helpers (zero external deps) ──────────────────────────

const CRC32_TABLE = makeCrc32Table()

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(dt: Date): { time: number; dosDate: number } {
  const time = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >>> 1)
  const dosDate = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate()
  return { time, dosDate }
}

function createZip(filename: string, data: Buffer): Buffer {
  const compressed = deflateSync(data, { level: 9 })
  const now = new Date()
  const { time, dosDate } = dosDateTime(now)
  const crc = crc32(data)
  const nameBuf = Buffer.from(filename, 'utf-8')
  const nameLen = nameBuf.length

  // Local file header
  const localHeader = Buffer.alloc(30)
  localHeader.writeUInt32LE(0x04034b50, 0)     // signature
  localHeader.writeUInt16LE(20, 4)               // version needed
  localHeader.writeUInt16LE(0, 6)                // flags
  localHeader.writeUInt16LE(8, 8)                // compression: deflate
  localHeader.writeUInt16LE(time, 10)            // mod time
  localHeader.writeUInt16LE(dosDate, 12)         // mod dosDate
  localHeader.writeUInt32LE(crc, 14)             // crc32
  localHeader.writeUInt32LE(compressed.length, 18) // compressed size
  localHeader.writeUInt32LE(data.length, 22)     // uncompressed size
  localHeader.writeUInt16LE(nameLen, 26)         // filename length
  localHeader.writeUInt16LE(0, 28)               // extra field length

  // Central directory header
  const centralHeader = Buffer.alloc(46)
  centralHeader.writeUInt32LE(0x02014b50, 0)     // signature
  centralHeader.writeUInt16LE(20, 4)               // version made by
  centralHeader.writeUInt16LE(20, 6)               // version needed
  centralHeader.writeUInt16LE(0, 8)                // flags
  centralHeader.writeUInt16LE(8, 10)               // compression: deflate
  centralHeader.writeUInt16LE(time, 12)            // mod time
  centralHeader.writeUInt16LE(dosDate, 14)         // mod dosDate
  centralHeader.writeUInt32LE(crc, 16)             // crc32
  centralHeader.writeUInt32LE(compressed.length, 20) // compressed size
  centralHeader.writeUInt32LE(data.length, 24)     // uncompressed size
  centralHeader.writeUInt16LE(nameLen, 28)         // filename length
  centralHeader.writeUInt16LE(0, 30)               // extra field length
  centralHeader.writeUInt16LE(0, 32)               // file comment length
  centralHeader.writeUInt16LE(0, 34)               // disk number start
  centralHeader.writeUInt16LE(0, 36)               // internal file attributes
  centralHeader.writeUInt32LE(0, 38)               // external file attributes

  const localHeaderOffset = 0
  centralHeader.writeUInt32LE(localHeaderOffset, 42) // relative offset

  // End of central directory
  const centralOffset = localHeader.length + nameLen + compressed.length
  const centralSize = centralHeader.length + nameLen

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)              // signature
  eocd.writeUInt16LE(0, 4)                        // disk number
  eocd.writeUInt16LE(0, 6)                        // disk with central dir
  eocd.writeUInt16LE(1, 8)                        // entries on disk
  eocd.writeUInt16LE(1, 10)                       // total entries
  eocd.writeUInt32LE(centralSize, 12)             // size of central dir
  eocd.writeUInt32LE(centralOffset, 16)           // offset of central dir
  eocd.writeUInt16LE(0, 20)                       // comment length

  return Buffer.concat([
    localHeader, nameBuf, compressed,
    centralHeader, nameBuf,
    eocd,
  ])
}

function readZipEntry(zipBuffer: Buffer): { filename: string; data: Buffer } | null {
  try {
    const signature = zipBuffer.readUInt32LE(0)
    if (signature !== 0x04034b50) return null

    const nameLen = zipBuffer.readUInt16LE(26)
    const extraLen = zipBuffer.readUInt16LE(28)
    const compMethod = zipBuffer.readUInt16LE(8)
    const compSize = zipBuffer.readUInt32LE(18)
    const uncompSize = zipBuffer.readUInt32LE(22)

    const filename = zipBuffer.subarray(30, 30 + nameLen).toString('utf-8')
    const dataStart = 30 + nameLen + extraLen
    const compressedData = zipBuffer.subarray(dataStart, dataStart + compSize)

    if (compMethod === 0) {
      return { filename, data: compressedData }
    }
    if (compMethod === 8) {
      return { filename, data: inflateSync(compressedData) }
    }
    return null
  } catch {
    return null
  }
}

// ── Database helpers ──────────────────────────────────────────

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

// ── Public API ────────────────────────────────────────────────

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

  const jsonBuffer = Buffer.from(JSON.stringify(manifest, null, 2))
  const zipBuffer = createZip('backup.json', jsonBuffer)

  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const filename = `backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.zip`

  return { buffer: zipBuffer, filename }
}

export async function validateBackup(
  buffer: Buffer
): Promise<{ valid: boolean; error?: string; preview?: BackupPreview }> {
  try {
    const entry = readZipEntry(buffer)
    if (!entry) {
      return { valid: false, error: 'Archivo de backup inválido: no se pudo leer el contenido del ZIP' }
    }

    if (entry.filename !== 'backup.json') {
      return { valid: false, error: 'Archivo de backup inválido: no se encontró backup.json en el ZIP' }
    }

    const content = entry.data.toString('utf-8')
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

        for (const row of rows) {
          const values = columns.map((c) => (row as Record<string, unknown>)[c] ?? null)
          await tx.$executeRawUnsafe(
            `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`,
            ...values
          )
        }
        totalRestored += (rows as unknown[]).length
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
    const entry = readZipEntry(buffer)
    if (!entry || entry.filename !== 'backup.json') return null
    return JSON.parse(entry.data.toString('utf-8'))
  } catch {
    return null
  }
}
