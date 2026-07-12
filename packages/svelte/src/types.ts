import type { ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import type { ComponentInteractionEvent, ComponentRenderFrame, ComponentSelectionEvent } from '@agentskit/chat-protocol'
import type { ChatState, Message, ToolCall } from '@agentskit/core'
import type { SvelteChatStore } from '@agentskit/svelte'
import type { Snippet } from 'svelte'

export interface AgentChatProps {
  definition: ChatDefinition
  placeholder?: string
  onComponentSelect?: (event: ComponentSelectionEvent | ComponentInteractionEvent) => void
  actionConfirmationTtlMs?: number
  session?: ChatSession
  theme?: ChatThemeInput
  container?: Snippet<[Snippet]>
  message?: Snippet<[Message]>
  input?: Snippet<[SvelteChatStore, ChatState, string | undefined]>
  thinking?: Snippet<[boolean]>
  confirmation?: Snippet<[ToolCall, (id: string) => void, (id: string, reason?: string) => void]>
  choiceList?: Snippet<[unknown, ComponentManifest, boolean, (event: ComponentSelectionEvent) => void]>
  standardComponent?: Snippet<[ComponentRenderFrame, ComponentManifest, boolean, (event: ComponentInteractionEvent) => void]>
}

export interface StandardComponentProps { frame: ComponentRenderFrame; manifest: ComponentManifest; onInteract: (event: ComponentInteractionEvent) => void; disabled?: boolean }

export interface ChoiceListProps {
  frame: unknown
  manifest: ComponentManifest
  onSelect: (event: ComponentSelectionEvent) => void
  disabled?: boolean
}
