import type { BasicNode, BasicRelationship } from 'neo4j-arc/common'
import type { GraphLink, GraphNode, GraphPayload } from '../../api'

function stringifyProperty(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function propertyTypes(properties: Record<string, unknown>): Record<string, string> {
  const types: Record<string, string> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) types[key] = 'null'
    else if (Array.isArray(value)) types[key] = 'List'
    else if (typeof value === 'object') types[key] = 'Map'
    else types[key] = typeof value
  }
  return types
}

function mapProperties(properties: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(properties)) {
    out[key] = stringifyProperty(value)
  }
  return out
}

export function toBasicNode(node: GraphNode): BasicNode {
  return {
    id: node.id,
    elementId: node.id,
    labels: node.labels,
    properties: mapProperties(node.properties),
    propertyTypes: propertyTypes(node.properties),
  }
}

export function toBasicRelationship(link: GraphLink): BasicRelationship {
  return {
    id: link.id,
    elementId: link.id,
    startNodeId: link.source,
    endNodeId: link.target,
    type: link.type,
    properties: mapProperties(link.properties),
    propertyTypes: propertyTypes(link.properties),
  }
}

export function toBasicGraph(payload: GraphPayload): {
  nodes: BasicNode[]
  relationships: BasicRelationship[]
} {
  return {
    nodes: payload.nodes.map(toBasicNode),
    relationships: payload.links.map(toBasicRelationship),
  }
}
