import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), '.data', 'uploads')
}

/** Safe extension from original filename, or .bin */
export function extensionFromFilename(filename: string): string {
  const ext = path.extname(filename)
  if (!ext || ext.length > 16) {
    return '.bin'
  }
  return ext.replace(/[^a-zA-Z0-9.]/g, '') || '.bin'
}

export function buildRelativeStorageKey(tenantId: string, originalName: string): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '')
  const id = randomUUID()
  return `${safeTenant}/${id}${extensionFromFilename(originalName)}`
}

export function absolutePathFromStorageKey(storageKey: string): string {
  const root = getUploadRoot()
  const normalized = storageKey.split('/').join(path.sep)
  return path.join(root, normalized)
}

export async function writeUploadedFile(storageKey: string, data: Buffer): Promise<void> {
  const abs = absolutePathFromStorageKey(storageKey)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, data)
}

export async function removeUploadedFile(storageKey: string | null | undefined): Promise<void> {
  if (!storageKey) {
    return
  }
  const abs = absolutePathFromStorageKey(storageKey)
  await unlink(abs).catch(() => undefined)
}
