import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { normalizeSafePath, toPosixRelative } from './paths.js'
import type { BrainStore, StoreEntry } from './store.js'

/** Fixture / test backend that reads a local brain tree. */
export class LocalFsStore implements BrainStore {
  constructor(readonly brainRoot: string) {}

  async listChildren(prefix: string): Promise<StoreEntry[]> {
    const abs = prefix ? join(this.brainRoot, normalizeSafePath(prefix)) : this.brainRoot
    let entries
    try {
      entries = await readdir(abs, { withFileTypes: true })
    } catch {
      return []
    }
    const result: StoreEntry[] = []
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        result.push({ name: entry.name, path, type: 'dir' })
      } else if (entry.isFile()) {
        result.push({ name: entry.name, path, type: 'file' })
      }
    }
    return result
  }

  async listFiles(prefix: string, maxDepth = 8): Promise<string[]> {
    const abs = join(this.brainRoot, prefix)
    return walk(this.brainRoot, abs, 0, maxDepth)
  }

  async readText(path: string): Promise<string | null> {
    const abs = join(this.brainRoot, normalizeSafePath(path))
    try {
      const info = await stat(abs)
      if (!info.isFile()) return null
      return await readFile(abs, 'utf8')
    } catch {
      return null
    }
  }

  async getSize(path: string): Promise<number | null> {
    const abs = join(this.brainRoot, normalizeSafePath(path))
    try {
      const info = await stat(abs)
      return info.isFile() ? info.size : null
    } catch {
      return null
    }
  }

  async writeText(path: string, content: string): Promise<void> {
    const abs = join(this.brainRoot, normalizeSafePath(path))
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, content, 'utf8')
  }
}

async function walk(brainRoot: string, absDir: string, depth: number, maxDepth: number): Promise<string[]> {
  if (depth > maxDepth) return []
  let entries
  try {
    entries = await readdir(absDir, { withFileTypes: true })
  } catch {
    return []
  }
  const files: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const abs = join(absDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(brainRoot, abs, depth + 1, maxDepth)))
    } else if (entry.isFile()) {
      files.push(toPosixRelative(brainRoot, abs))
    }
  }
  return files
}
