import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createStoreFromEnv } from './create-store.js'
import { closeNeo4jDriver } from './neo4j.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const HOST = process.env.VIEWER_API_HOST?.trim() || '127.0.0.1'
const PORT = Number(process.env.VIEWER_API_PORT ?? 8787)

const store = createStoreFromEnv()
const storageLabel =
  process.env.MINIO_BUCKET && process.env.MINIO_ENDPOINT
    ? `minio://${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}`
    : `local:${process.env.BRAIN_ROOT ?? '(default)'}`

const app = createApp({ store, storageLabel })

if (process.env.VERCEL !== '1') {
  const server = app.listen(PORT, HOST, () => {
    console.log(`Company Brain viewer API on http://${HOST}:${PORT}`)
    console.log(`Storage: ${storageLabel}`)
  })

  let shuttingDown = false
  const shutdown = (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    // Drop keep-alive sockets so server.close() does not hang under tsx watch
    server.closeAllConnections?.()
    server.close(() => {
      void closeNeo4jDriver()
        .catch(() => undefined)
        .finally(() => {
          process.exit(0)
        })
    })
    setTimeout(() => {
      console.error(`Forced exit after ${signal}`)
      process.exit(1)
    }, 3000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

export default app
