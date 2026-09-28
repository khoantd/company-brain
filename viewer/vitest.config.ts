import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const neo4jArcCandidates = [
  path.resolve(rootDir, 'vendor/neo4j-arc'),
  path.resolve(rootDir, '../../neo4j-browser/src/neo4j-arc'),
]
const neo4jArc = neo4jArcCandidates.find((candidate) => fs.existsSync(candidate))
if (!neo4jArc) {
  throw new Error(
    `neo4j-arc not found. Checked:\n${neo4jArcCandidates.map((c) => `  - ${c}`).join('\n')}`,
  )
}
const reactRoot = path.resolve(rootDir, 'node_modules/react')
const reactDomRoot = path.resolve(rootDir, 'node_modules/react-dom')

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'neo4j-arc/graph-visualization': path.join(neo4jArc, 'graph-visualization'),
      'neo4j-arc/common': path.join(neo4jArc, 'common'),
      react: reactRoot,
      'react-dom': reactDomRoot,
      'react/jsx-runtime': path.join(reactRoot, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(reactRoot, 'jsx-dev-runtime.js'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
