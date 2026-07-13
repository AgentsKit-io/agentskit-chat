import type { Message } from '@agentskit/core'
import {
  decodeAssistantContent,
  decodeComponentFrame,
  isAssistantContentCandidate,
  isComponentFrameCandidate,
  type ComponentRenderFrame,
} from '@agentskit/chat-protocol'

export type ChatMessagePresentation =
  | { readonly kind: 'message'; readonly message: Message }
  | { readonly kind: 'component'; readonly frame: ComponentRenderFrame }
  | { readonly kind: 'diagnostic'; readonly code: string; readonly message: string }

/** Decodes ordered assistant content and legacy direct component frames for every renderer. */
export const presentChatMessage = (message: Message): readonly ChatMessagePresentation[] => {
  if (message.role === 'assistant' && isAssistantContentCandidate(message.content)) {
    const decoded = decodeAssistantContent(message.content)
    if (!decoded.ok) return [{ kind: 'diagnostic', code: decoded.diagnostic.code, message: decoded.diagnostic.message }]
    const parts: ChatMessagePresentation[] = []
    for (const part of decoded.parts) {
      if (part.kind === 'component') {
        parts.push({ kind: 'component', frame: part.frame })
        continue
      }
      const previous = parts.at(-1)
      if (previous?.kind === 'message') {
        parts[parts.length - 1] = { kind: 'message', message: { ...previous.message, content: previous.message.content + part.text } }
      } else {
        parts.push({ kind: 'message', message: { ...message, content: part.text } })
      }
    }
    return parts
  }
  if (message.role === 'assistant' && isComponentFrameCandidate(message.content)) {
    const decoded = decodeComponentFrame(message.content)
    return decoded.ok
      ? [{ kind: 'component', frame: decoded.frame }]
      : [{ kind: 'diagnostic', code: decoded.diagnostic.code, message: decoded.diagnostic.message }]
  }
  return [{ kind: 'message', message }]
}
