/** Abstract knowledge backend for canonical Company Brain folders. */

export type StoreEntry = {
  name: string
  path: string
  type: 'dir' | 'file'
}

export interface BrainStore {
  /** Immediate children under a relative prefix (no leading/trailing slash). */
  listChildren(prefix: string): Promise<StoreEntry[]>
  /** All file paths under prefix, depth-limited. */
  listFiles(prefix: string, maxDepth?: number): Promise<string[]>
  /** UTF-8 text, or null if missing. */
  readText(path: string): Promise<string | null>
  /** Byte size, or null if missing. */
  getSize(path: string): Promise<number | null>
  /** Create or overwrite UTF-8 text at path. */
  writeText(path: string, content: string): Promise<void>
}
