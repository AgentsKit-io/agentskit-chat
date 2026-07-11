import type { ChatConfig } from '@agentskit/core'
import { z } from 'zod'

export interface ChatDefinition {
  readonly id: string
  readonly chat: ChatConfig
}

export const defineChat = <const T extends ChatDefinition>(definition: T): T => definition

export const SemanticFallbackSchema = z.object({
  kind: z.string().min(1),
  summary: z.string().min(1),
}).readonly()

export type SemanticFallback = z.infer<typeof SemanticFallbackSchema>

export const parseSemanticFallback = (input: unknown): SemanticFallback =>
  SemanticFallbackSchema.parse(input)

export const formatSemanticFallback = (fallback: SemanticFallback): string =>
  `[unsupported visual: ${fallback.kind}] ${fallback.summary}`
