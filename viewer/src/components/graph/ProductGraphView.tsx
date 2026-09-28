import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ArcThemeProvider } from 'neo4j-arc/common'
import { GraphVisualizer } from 'neo4j-arc/graph-visualization'
import { api } from '../../api'
import { toBasicGraph } from './to-basic-graph'

export function ProductGraphView({
  slug,
  onBack,
  onExplore,
}: {
  slug: string
  onBack: () => void
  onExplore: () => void
}) {
  const graphQuery = useQuery({
    queryKey: ['neo4j', 'product', slug],
    queryFn: () => api.neo4jProductGraph(slug),
    retry: 1,
  })

  const { nodes, relationships } = useMemo(() => {
    const payload = graphQuery.data?.graph ?? { nodes: [], links: [] }
    return toBasicGraph(payload)
  }, [graphQuery.data])

  const product = graphQuery.data?.product
  const onlyProduct =
    Boolean(product) &&
    (graphQuery.data?.graph.nodes.length ?? 0) <= 1 &&
    (graphQuery.data?.graph.links.length ?? 0) === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line bg-paper px-4 py-3 sm:px-6">
        <nav className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink/50" aria-label="Breadcrumb">
          <button
            type="button"
            className="cursor-pointer text-teal hover:underline"
            onClick={onBack}
          >
            Knowledge graph
          </button>
          <span aria-hidden>/</span>
          <span className="text-ink/70">{product?.name ?? slug}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg text-ink">{product?.name ?? slug}</p>
            <p className="mt-0.5 text-xs text-ink/50">
              Features, integrations, and product relationships
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-medium text-ink hover:border-teal hover:text-teal"
              onClick={onBack}
            >
              All products
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-medium text-ink hover:border-teal hover:text-teal"
              onClick={onExplore}
            >
              Custom Cypher
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#F9FCFF]">
        {graphQuery.isLoading && (
          <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-ink/50">
            Loading product graph…
          </p>
        )}
        {graphQuery.error && (
          <p className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm text-coral">
            {(graphQuery.error as Error).message}
          </p>
        )}
        {!graphQuery.isLoading && !graphQuery.error && onlyProduct && (
          <p className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto max-w-md px-4 text-center text-sm text-ink/45">
            No features or integrations linked to this product yet. The product node is shown alone.
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
          ? `${graphQuery.data.graph.nodes.length} nodes · ${graphQuery.data.graph.links.length} relationships`
          : 'Loading…'}
      </div>
    </div>
  )
}
