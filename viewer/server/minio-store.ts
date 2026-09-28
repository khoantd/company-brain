import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { normalizeSafePath } from './paths.js'
import type { BrainStore, StoreEntry } from './store.js'

export type MinioStoreConfig = {
  endpoint: string
  accessKey: string
  secretKey: string
  bucket: string
  secure: boolean
}

/** Production backend: Company Brain knowledge objects in MinIO. */
export class MinioStore implements BrainStore {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: MinioStoreConfig, client?: S3Client) {
    this.bucket = config.bucket
    const endpoint = config.endpoint.includes('://')
      ? config.endpoint
      : `${config.secure ? 'https' : 'http'}://${config.endpoint}`
    this.client =
      client ??
      new S3Client({
        region: 'us-east-1',
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        },
      })
  }

  async listChildren(prefix: string): Promise<StoreEntry[]> {
    const keyPrefix = prefix ? `${normalizeSafePath(prefix).replace(/\/$/, '')}/` : ''
    const out = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: keyPrefix,
        Delimiter: '/',
      }),
    )
    const entries: StoreEntry[] = []
    for (const cp of out.CommonPrefixes ?? []) {
      const p = (cp.Prefix ?? '').replace(/\/$/, '')
      if (!p) continue
      const name = p.slice(keyPrefix.length)
      if (!name || name.startsWith('.')) continue
      entries.push({ name, path: p, type: 'dir' })
    }
    for (const obj of out.Contents ?? []) {
      const key = obj.Key ?? ''
      if (!key || key.endsWith('/') || key === keyPrefix) continue
      const name = key.slice(keyPrefix.length)
      if (!name || name.includes('/') || name.startsWith('.')) continue
      entries.push({ name, path: key, type: 'file' })
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }

  async listFiles(prefix: string, maxDepth = 8): Promise<string[]> {
    const keyPrefix = `${prefix.replace(/\/$/, '')}/`
    const files: string[] = []
    let token: string | undefined
    do {
      const out = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: keyPrefix,
          ContinuationToken: token,
        }),
      )
      for (const obj of out.Contents ?? []) {
        const key = obj.Key ?? ''
        if (!key || key.endsWith('/')) continue
        const rel = key.slice(keyPrefix.length)
        if (!rel || rel.split('/').some((p) => p.startsWith('.'))) continue
        if (rel.split('/').length > maxDepth + 1) continue
        files.push(key)
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined
    } while (token)
    return files.sort()
  }

  async readText(path: string): Promise<string | null> {
    const key = normalizeSafePath(path)
    try {
      const out = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      if (!out.Body) return null
      return await out.Body.transformToString('utf-8')
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async getSize(path: string): Promise<number | null> {
    const key = normalizeSafePath(path)
    try {
      const out = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return typeof out.ContentLength === 'number' ? out.ContentLength : null
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async writeText(path: string, content: string): Promise<void> {
    const key = normalizeSafePath(path)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        ContentType: contentTypeFor(key),
      }),
    )
  }
}

function contentTypeFor(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) {
    return 'text/markdown; charset=utf-8'
  }
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8'
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (/\.ya?ml$/i.test(lower)) return 'text/yaml; charset=utf-8'
  if (/\.(txt|csv|svg|css|js|ts|tsx|jsx)$/i.test(lower)) {
    return 'text/plain; charset=utf-8'
  }
  return 'application/octet-stream'
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String(error.name) : ''
  const code = '$metadata' in error ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode : undefined
  return name === 'NoSuchKey' || name === 'NotFound' || code === 404
}
