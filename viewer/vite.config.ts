import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
// neo4j-browser ships React 17; force a single React 19 from this app or GraphVisualizer
// elements fail with "React Element from an older version of React".
const reactRoot = path.resolve(rootDir, 'node_modules/react')
const reactDomRoot = path.resolve(rootDir, 'node_modules/react-dom')

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'react-vendor'
          }
          if (
            id.includes('neo4j-arc') ||
            id.includes('node_modules/d3-') ||
            id.includes('node_modules/styled-components') ||
            id.includes('node_modules/react-force-graph')
          ) {
            return 'neo4j-arc'
          }
          if (id.includes('node_modules/@tiptap') || id.includes('node_modules/tiptap-markdown') || id.includes('node_modules/prosemirror')) {
            return 'tiptap'
          }
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark-') ||
            id.includes('node_modules/rehype-') ||
            id.includes('node_modules/unified') ||
            id.includes('node_modules/mdast') ||
            id.includes('node_modules/hast')
          ) {
            return 'markdown'
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'd3-force',
      'd3-drag',
      'd3-selection',
      'd3-zoom',
      'd3-shape',
      'd3-ease',
      'styled-components',
      'deepmerge',
      'lodash-es',
      're-resizable',
      '@juggle/resize-observer',
      '@neo4j-devtools/word-color',
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
    fs: {
      allow: [rootDir, neo4jArc],
    },
  },
})
