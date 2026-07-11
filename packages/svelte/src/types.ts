import type { ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import type { ComponentSelectionEvent } from '@agentskit/chat-protocol'
import type { ChatState, Message, ToolCall } from '@agentskit/core'
import type { SvelteChatStore } from '@agentskit/svelte'
import type { Snippet } from 'svelte'

export interface AgentChatProps {
  definition: ChatDefinition
  placeholder?: string
  onComponentSelect?: (event: ComponentSelectionEvent) => void
  actionConfirmationTtlMs?: number
  session?: ChatSession
  theme?: ChatThemeInput
  container?: Snippet<[Snippet]>
  message?: Snippet<[Message]>
  input?: Snippet<[SvelteChatStore, ChatState, string | undefined]>
  thinking?: Snippet<[boolean]>
  confirmation?: Snippet<[ToolCall, (id: string) => void, (id: string, reason?: string) => void]>
  choiceList?: Snippet<[unknown, ComponentManifest, boolean, (event: ComponentSelectionEvent) => void]>
}

export interface ChoiceListProps {
  frame: unknown
  manifest: ComponentManifest
  onSelect: (event: ComponentSelectionEvent) => void
  disabled?: boolean
}
