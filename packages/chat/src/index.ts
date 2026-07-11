import type { ChatConfig } from '@agentskit/core'

export interface ChatDefinition {
  readonly id: string
  readonly chat: ChatConfig
}

export const defineChat = <const T extends ChatDefinition>(definition: T): T => definition
