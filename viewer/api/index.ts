import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from '../server/app.js'
import { createStoreFromEnv } from '../server/create-store.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
loadEnv({ path: resolve(__dirname, '../.env') })

const store = createStoreFromEnv()
const storageLabel =
  process.env.MINIO_BUCKET && process.env.MINIO_ENDPOINT
    ? `minio://${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}`
    : `local:${process.env.BRAIN_ROOT ?? '(default)'}`

const app = createApp({
  store,
  storageLabel,
  secureCookies: true,
  serveStatic: true,
})

export default app
