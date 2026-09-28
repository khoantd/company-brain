import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LocalFsStore } from './local-fs-store.js'
import { MinioStore } from './minio-store.js'
import type { BrainStore } from './store.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Production: MinIO when MINIO_* is set.
 * Tests / fixtures: LocalFsStore via BRAIN_ROOT or createLocalStore().
 */
export function createStoreFromEnv(): BrainStore {
  const endpoint = process.env.MINIO_ENDPOINT?.trim()
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim()
  const secretKey = process.env.MINIO_SECRET_KEY?.trim()
  const bucket = process.env.MINIO_BUCKET?.trim()

  if (endpoint && accessKey && secretKey && bucket) {
    const secure = /^(1|true|yes)$/i.test(process.env.MINIO_SECURE?.trim() ?? 'true')
    return new MinioStore({ endpoint, accessKey, secretKey, bucket, secure })
  }

  if (process.env.BRAIN_ROOT?.trim()) {
    return new LocalFsStore(resolve(process.env.BRAIN_ROOT.trim()))
  }

  throw new Error(
    'Knowledge storage is not configured. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, ' +
      'MINIO_SECRET_KEY, and MINIO_BUCKET (or BRAIN_ROOT for local fixture mode).',
  )
}

/** Explicit local store for vitest fixtures. */
export function createLocalStore(brainRoot?: string): LocalFsStore {
  return new LocalFsStore(brainRoot ?? resolve(__dirname, '../..'))
}
