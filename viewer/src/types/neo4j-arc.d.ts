declare module 'neo4j-arc/common' {
  import type { FC, ReactNode } from 'react'

  export type BasicNode = {
    id: string
    elementId: string
    labels: string[]
    properties: Record<string, string>
    propertyTypes: Record<string, string>
  }

  export type BasicRelationship = {
    id: string
    elementId: string
    startNodeId: string
    endNodeId: string
    type: string
    properties: Record<string, string>
    propertyTypes: Record<string, string>
  }

  export const ArcThemeProvider: FC<{
    children: ReactNode
    theme?: Record<string, string>
  }>
}

declare module 'neo4j-arc/graph-visualization' {
  import type { ComponentType } from 'react'
  import type { BasicNode, BasicRelationship } from 'neo4j-arc/common'

  export type GraphVisualizerProps = {
    nodes: BasicNode[]
    relationships: BasicRelationship[]
    autocompleteRelationships: boolean
    initialZoomToFit?: boolean
    useGeneratedDefaultColors?: boolean
    maxNeighbours?: number
    isFullscreen?: boolean
  }

  export const GraphVisualizer: ComponentType<GraphVisualizerProps>
}
