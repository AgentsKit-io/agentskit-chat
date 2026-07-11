import { formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat-protocol'
import type { ComponentRenderFrame, ComponentSelectionEvent } from '@agentskit/chat-protocol'
import { ChatRoot, InputBar, Message, ThinkingIndicator, ToolConfirmation, useChat } from '@agentskit/vue'
import type { Message as ChatMessage } from '@agentskit/core'
import { defineComponent, Fragment, h, ref, type CSSProperties, type PropType, type Slots, type VNodeChild } from 'vue'

export type ChatCssVariables = CSSProperties & { readonly [key: `--ak-${string}`]: string | number }

export const toChatCssVariables = (input?: ChatThemeInput): ChatCssVariables => {
  const theme = resolveChatTheme(input)
  return {
    '--ak-color-bg': theme.colors.background,
    '--ak-color-surface': theme.colors.surface,
    '--ak-color-border': theme.colors.border,
    '--ak-color-text': theme.colors.text,
    '--ak-color-text-muted': theme.colors.muted,
    '--ak-color-bubble-user': theme.colors.accent,
    '--ak-color-bubble-user-text': theme.colors.onAccent,
    '--ak-color-bubble-assistant': theme.colors.surface,
    '--ak-color-bubble-assistant-text': theme.colors.text,
    '--ak-color-input-bg': theme.colors.background,
    '--ak-color-input-border': theme.colors.border,
    '--ak-color-input-focus': theme.colors.accent,
    '--ak-color-button': theme.colors.accent,
    '--ak-color-button-text': theme.colors.onAccent,
    '--ak-color-tool-bg': theme.colors.surface,
    '--ak-color-tool-border': theme.colors.border,
    '--ak-app-color-danger': theme.colors.danger,
    '--ak-font-family': theme.fontFamily === 'system' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : theme.fontFamily,
    '--ak-radius': `${theme.radius.medium}px`,
    '--ak-radius-lg': `${theme.radius.large}px`,
    '--ak-spacing-sm': `${theme.spacing.small}px`,
    '--ak-spacing-md': `${theme.spacing.medium}px`,
    '--ak-spacing-lg': `${theme.spacing.large}px`,
  }
}

export interface ChoiceListProps {
  readonly frame: unknown
  readonly manifest: ComponentManifest
  readonly onSelect: (event: ComponentSelectionEvent) => void
  readonly disabled?: boolean
}

export const ChoiceList = defineComponent({
  name: 'AgentsKitChoiceList',
  props: {
    frame: { type: null, required: true },
    manifest: { type: Object as PropType<ComponentManifest>, required: true },
    onSelect: { type: Function as PropType<(event: ComponentSelectionEvent) => void>, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      const resolved = resolveChoiceListFrame(props.frame, props.manifest)
      if (!resolved.ok) return null
      return h('fieldset', { 'aria-label': resolved.props.prompt, 'data-ak-component': 'choice-list' }, [
        h('legend', resolved.props.prompt),
        ...resolved.props.choices.map(choice => h('button', {
          key: choice.id,
          type: 'button',
          disabled: props.disabled,
          onClick: () => props.onSelect(selectChoice(resolved.frame, choice.id)),
        }, [h('span', choice.label), choice.description === undefined ? null : h('small', choice.description)])),
      ])
    }
  },
})

export interface AgentChatProps {
  readonly definition: ChatDefinition
  readonly placeholder?: string
  readonly onComponentSelect?: (event: ComponentSelectionEvent) => void
  readonly actionConfirmationTtlMs?: number
  readonly session?: ChatSession
  readonly theme?: ChatThemeInput
}

const slot = (slots: Slots, name: string, props: Record<string, unknown>, fallback: () => VNodeChild): VNodeChild =>
  slots[name]?.(props) ?? fallback()

const agentChatProps = {
  definition: { type: Object as PropType<ChatDefinition>, required: true },
  placeholder: { type: String, default: undefined },
  onComponentSelect: { type: Function as PropType<(event: ComponentSelectionEvent) => void>, default: undefined },
  actionConfirmationTtlMs: { type: Number, default: undefined },
  session: { type: Object as PropType<ChatSession>, default: undefined },
  theme: { type: Object as PropType<ChatThemeInput>, default: undefined },
} as const

const AgentChatSession = defineComponent({
  name: 'AgentsKitChatSession',
  props: {
    ...agentChatProps,
    initialMessages: { type: Array as PropType<ChatMessage[]>, default: undefined },
    onMessages: { type: Function as PropType<(messages: ChatMessage[]) => void>, required: true },
  },
  setup(props, { slots }) {
    const session = resolveChatSession(props.definition, props.session)
    const sessionId = session.sessionId
    const chat = useChat(session.updateChat({
      ...props.definition.chat,
      ...(props.initialMessages === undefined ? {} : { initialMessages: props.initialMessages }),
    }))
    const actionError = ref<Error>()
    const editDraft = ref<{ readonly messageId: string, readonly content: string }>()
    const resolvedInstances = ref(new Set<string>())
    const confirmation = session.createConfirmation({
      ...(props.actionConfirmationTtlMs === undefined ? {} : { ttlMs: props.actionConfirmationTtlMs }),
      chat: {
        proposeToolCall: proposal => chat.proposeToolCall(proposal),
        approve: id => chat.approve(id),
        deny: (id, reason) => chat.deny(id, reason),
      },
    })
    const fail = (error: unknown, fallback: string): void => { actionError.value = error instanceof Error ? error : new Error(fallback) }
    const selectComponent = (event: ComponentSelectionEvent, frame: ComponentRenderFrame): void => {
      if (resolvedInstances.value.has(event.instanceId)) return
      actionError.value = undefined
      resolvedInstances.value.add(event.instanceId)
      try { props.onComponentSelect?.(event) } catch (error) { fail(error, 'Component selection callback failed.') }
      const action = resolveChoiceAction(frame, event.choiceId)
      if (action) void confirmation.propose(action).catch(error => {
        resolvedInstances.value.delete(event.instanceId)
        fail(error, 'Action proposal failed.')
      })
    }
    const approve = (toolCallId: string): void => {
      const record = confirmation.getByToolCall(toolCallId)
      void (record ? confirmation.approve(record.token, sessionId) : chat.approve(toolCallId)).catch(error => fail(error, 'Action approval failed.'))
    }
    const deny = (toolCallId: string, reason?: string): void => {
      const record = confirmation.getByToolCall(toolCallId)
      void (record ? confirmation.reject(record.token, sessionId, reason) : chat.deny(toolCallId, reason)).catch(error => fail(error, 'Action rejection failed.'))
    }
    const runLifecycle = (operation: Promise<void>): void => {
      actionError.value = undefined
      void operation.catch(error => fail(error, 'Lifecycle operation failed.'))
    }

    return () => {
      props.onMessages(chat.messages)
      const targets = getLifecycleTargets(chat.messages)
      const messages = chat.messages.map(message => {
        const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
        const decoded = candidate ? decodeComponentFrame(message.content) : undefined
        if (decoded?.ok) {
          const resolved = props.definition.components === undefined ? undefined : resolveChoiceListFrame(decoded.frame, props.definition.components)
          const rendered = resolved?.ok
            ? slot(slots, 'choiceList', { frame: decoded.frame, manifest: props.definition.components, disabled: resolvedInstances.value.has(decoded.frame.instanceId), onSelect: (event: ComponentSelectionEvent) => selectComponent(event, decoded.frame) }, () => h(ChoiceList, { frame: decoded.frame, manifest: props.definition.components!, disabled: resolvedInstances.value.has(decoded.frame.instanceId), onSelect: (event: ComponentSelectionEvent) => selectComponent(event, decoded.frame) }))
            : h('p', { 'data-ak-component-fallback': '' }, formatSemanticFallback(decoded.frame.fallback))
          return h(Fragment, { key: message.id }, [rendered])
        }
        const rendered = decoded && !decoded.ok
          ? h('p', { role: 'alert', 'data-ak-component-diagnostic': decoded.diagnostic.code }, decoded.diagnostic.message)
          : slot(slots, 'message', { message }, () => h(Message, { message }))
        return h(Fragment, { key: message.id }, [rendered])
      })
      const confirmations = chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall =>
        h(Fragment, { key: toolCall.id }, [slot(slots, 'confirmation', { toolCall, onApprove: approve, onDeny: deny }, () => h(ToolConfirmation, { toolCall, onApprove: approve, onDeny: deny }))]))
      const content = [...messages, ...confirmations, slot(slots, 'thinking', { visible: chat.status === 'streaming' }, () => h(ThinkingIndicator, { visible: chat.status === 'streaming' }))]
      const container = slot(slots, 'container', { children: content }, () => h(ChatRoot, {}, { default: () => content }))
      const error = chat.error ?? actionError.value
      return h('section', {
        'aria-label': `${props.definition.id} chat`,
        'data-ak-app-chat': '',
        style: props.theme === undefined ? undefined : toChatCssVariables(props.theme),
      }, [
        h('div', { 'aria-live': 'polite', 'aria-relevant': 'additions text', role: 'log' }, [container]),
        error ? h('p', { role: 'alert', style: { color: resolveChatTheme(props.theme).colors.danger } }, error.message) : null,
        chat.status === 'streaming' ? h('button', { type: 'button', onClick: chat.stop }, 'Stop') : null,
        chat.status !== 'streaming' && targets.userId ? h('div', { 'aria-label': 'Response actions' }, [
          h('button', { type: 'button', 'aria-label': 'Retry response', onClick: () => runLifecycle(chat.retry()) }, 'Retry'),
          targets.assistantId ? h('button', { type: 'button', 'aria-label': 'Regenerate response', onClick: () => runLifecycle(chat.regenerate(targets.assistantId!)) }, 'Regenerate') : null,
          h('button', { type: 'button', onClick: () => { editDraft.value = { messageId: targets.userId!, content: chat.messages.find(message => message.id === targets.userId)?.content ?? '' } } }, 'Edit last message'),
          editDraft.value === undefined ? null : h('form', { onSubmit: (event: Event) => {
            event.preventDefault()
            if (!editDraft.value?.content.trim()) return
            runLifecycle(chat.edit(editDraft.value.messageId, editDraft.value.content))
            editDraft.value = undefined
          } }, [
            h('label', ['Edit message', h('input', { 'aria-label': 'Edit message', value: editDraft.value.content, onInput: (event: Event) => { editDraft.value = { ...editDraft.value!, content: (event.target as HTMLInputElement).value } } })]),
            h('button', { type: 'submit', 'aria-label': 'Save edit' }, 'Save edit'),
            h('button', { type: 'button', onClick: () => { editDraft.value = undefined } }, 'Cancel edit'),
          ]),
        ]) : null,
        slot(slots, 'input', { chat, disabled: chat.status === 'streaming', placeholder: props.placeholder }, () => h(InputBar, { chat, disabled: chat.status === 'streaming', ...(props.placeholder === undefined ? {} : { placeholder: props.placeholder }) })),
      ])
    }
  },
})

export const AgentChat = defineComponent({
  name: 'AgentsKitChat',
  props: agentChatProps,
  setup(props, { slots }) {
    let definitionId = props.definition.id
    let definitionRevision = props.definition.revision
    let preparedSession = props.session
    let session = resolveChatSession(props.definition, preparedSession)
    let chat = props.definition.chat
    let chatRevision = 0
    let messages = chat.initialMessages
    return () => {
      if (definitionId !== props.definition.id || definitionRevision !== props.definition.revision || preparedSession !== props.session) {
        definitionId = props.definition.id
        definitionRevision = props.definition.revision
        preparedSession = props.session
        session = resolveChatSession(props.definition, preparedSession)
        messages = props.definition.chat.initialMessages
      }
      if (chat !== props.definition.chat) { chat = props.definition.chat; chatRevision += 1 }
      return h(AgentChatSession, {
        ...props,
        session,
        initialMessages: messages,
        onMessages: (value: ChatMessage[]) => { messages = value },
        key: `${definitionId}:${definitionRevision ?? 1}:${session.sessionId}:${chatRevision}`,
      } as never, slots)
    }
  },
})

export type { ChatDefinition } from '@agentskit/chat'
