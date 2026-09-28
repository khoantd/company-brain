import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { ArcThemeProvider } from 'neo4j-arc/common'
import { GraphVisualizer } from 'neo4j-arc/graph-visualization'
import { api, type GraphPayload } from '../../api'
import { toBasicGraph } from './to-basic-graph'

const DEFAULT_CYPHER = `MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 25`

/** Free-form Cypher explorer (power-user path). */
export function KnowledgeGraphExploreView({
  onBack,
  initialCypher,
}: {
  onBack: () => void
  initialCypher?: string
}) {
  const startingCypher = initialCypher?.trim() || DEFAULT_CYPHER
  const [cypherDraft, setCypherDraft] = useState(startingCypher)
  const [cypher, setCypher] = useState(startingCypher)

  const graphQuery = useQuery({
    queryKey: ['neo4j', 'graph', cypher],
    queryFn: () => api.neo4jGraph(cypher),
    retry: 1,
  })

  const { nodes, relationships } = useMemo(() => {
    const payload: GraphPayload = graphQuery.data ?? { nodes: [], links: [] }
    return toBasicGraph(payload)
  }, [graphQuery.data])

  const runQuery = useCallback(() => {
    setCypher(cypherDraft)
  }, [cypherDraft])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line bg-paper px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <nav className="mb-1 flex items-center gap-2 text-xs text-ink/50" aria-label="Breadcrumb">
              <button
                type="button"
                className="cursor-pointer text-teal hover:underline"
                onClick={onBack}
              >
                Knowledge graph
              </button>
              <span aria-hidden>/</span>
              <span className="text-ink/70">Custom Cypher</span>
            </nav>
            <p className="font-display text-lg text-ink">Custom Cypher</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-medium text-ink hover:border-teal hover:text-teal"
              onClick={onBack}
            >
              All products
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90"
              onClick={runQuery}
              disabled={graphQuery.isFetching}
            >
              {graphQuery.isFetching ? 'Running…' : 'Run'}
            </button>
          </div>
        </div>
        <label className="block text-xs text-ink/60" htmlFor="cypher-editor">
          Cypher (read-only)
        </label>
        <textarea
          id="cypher-editor"
          className="mt-1 w-full resize-y rounded-md border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink outline-none focus:border-teal"
          rows={4}
          value={cypherDraft}
          onChange={(e) => setCypherDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              runQuery()
            }
          }}
          spellCheck={false}
        />
      </div>

      <div className="relative min-h-0 flex-1 bg-[#F9FCFF]">
        {graphQuery.isLoading && (
          <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-ink/50">
            Loading graph…
          </p>
        )}
        {graphQuery.error && (
          <p className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm text-coral">
            {(graphQuery.error as Error).message}
          </p>
        )}
        {!graphQuery.isLoading && !graphQuery.error && (
          <ArcThemeProvider>
            <GraphVisualizer
              nodes={nodes}
              relationships={relationships}
              autocompleteRelationships={false}
              initialZoomToFit
              useGeneratedDefaultColors
            />
          </ArcThemeProvider>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-sidebar px-4 py-1.5 text-xs text-paper/70">
        {graphQuery.data
          ? `${graphQuery.data.nodes.length} nodes · ${graphQuery.data.links.length} relationships`
          : 'Run a Cypher query to load the graph'}
      </div>
    </div>
  )
}
