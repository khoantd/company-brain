import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Archive, CheckCircle, Clock, Info, HelpCircle } from 'lucide-react'

export const KNOWLEDGE_STATUSES = [
  'proposed',
  'approved',
  'confirmed',
  'unverified',
  'conflicting',
  'superseded',
] as const

export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number]

const LABELS: Record<KnowledgeStatus, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  confirmed: 'Confirmed',
  unverified: 'Unverified',
  conflicting: 'Conflicting',
  superseded: 'Superseded',
}

const BADGE_CLASS: Record<KnowledgeStatus, string> = {
  proposed: 'border-ahead/30 bg-ahead/10 text-ahead',
  approved: 'border-track/30 bg-track/10 text-track',
  confirmed: 'border-track/30 bg-track/10 text-track',
  unverified: 'border-ahead/30 bg-ahead/10 text-ahead',
  conflicting: 'border-coral/30 bg-coral/10 text-coral',
  superseded: 'border-line bg-mist/60 text-ink/55',
}

const ICONS: Record<KnowledgeStatus, LucideIcon> = {
  proposed: Clock,
  approved: CheckCircle,
  confirmed: CheckCircle,
  unverified: HelpCircle,
  conflicting: AlertTriangle,
  superseded: Archive,
}

export function isKnowledgeStatus(value: string): value is KnowledgeStatus {
  return (KNOWLEDGE_STATUSES as readonly string[]).includes(value)
}

export function parseKnowledgeStatus(value: unknown): KnowledgeStatus | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  return isKnowledgeStatus(trimmed) ? trimmed : null
}

export function knowledgeStatusLabel(status: KnowledgeStatus): string {
  return LABELS[status]
}

export function knowledgeStatusBadgeClass(status: KnowledgeStatus): string {
  return BADGE_CLASS[status]
}

export function knowledgeStatusIcon(status: KnowledgeStatus): LucideIcon {
  return ICONS[status]
}

export function needsStatusConfirm(status: KnowledgeStatus): boolean {
  return status === 'approved' || status === 'superseded'
}

export function existingApprover(frontmatter?: Record<string, unknown>): string {
  const raw = frontmatter?.approved_by
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return ''
  return trimmed
}

/** Fallback icon when FM status is missing or non-canonical. */
export const UnknownStatusIcon = Info
