import { formatSemanticFallback, getLifecycleTargets, resolveChatSession, resolveChatTheme, resolveChoiceAction, resolveChoiceListFrame, resolveComponentFrame, selectChoice } from '@agentskit/chat'
import type { ChatDefinition, ChatSession, ChatThemeInput, ComponentManifest } from '@agentskit/chat'
import { decodeComponentFrame, isComponentFrameCandidate } from '@agentskit/chat-protocol'
import type { ComponentInteractionEvent, ComponentRenderFrame, ComponentSelectionEvent } from '@agentskit/chat-protocol'
import { ChatRoot, InputBar, Message, ThinkingIndicator, ToolConfirmation, useChat } from '@agentskit/vue'
import type { ChatReturn, Message as ChatMessage, ToolCall } from '@agentskit/core'
import { defineComponent, Fragment, h, ref, watchEffect, type CSSProperties, type PropType, type Slots, type SlotsType, type VNode, type VNodeChild } from 'vue'
import { StandardComponent, type StandardComponentProps } from './StandardComponent.js'

export { StandardComponent, type StandardComponentProps } from './StandardComponent.js'

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
  readonly onComponentSelect?: (event: ComponentSelectionEvent | ComponentInteractionEvent) => void
  readonly actionConfirmationTtlMs?: number
  readonly session?: ChatSession
  readonly theme?: ChatThemeInput
}

export interface AgentChatSlots {
  readonly container?: (props: { readonly children: VNodeChild }) => VNode[]
  readonly message?: (props: { readonly message: ChatMessage }) => VNode[]
  readonly input?: (props: { readonly chat: ChatReturn, readonly disabled: boolean, readonly placeholder?: string }) => VNode[]
  readonly thinking?: (props: { readonly visible: boolean }) => VNode[]
  readonly confirmation?: (props: { readonly toolCall: ToolCall, readonly onApprove: (id: string) => void, readonly onDeny: (id: string, reason?: string) => void }) => VNode[]
  readonly choiceList?: (props: ChoiceListProps) => VNode[]
  readonly standardComponent?: (props: StandardComponentProps) => VNode[]
}

const slot = (slots: Slots, name: string, props: Record<string, unknown>, fallback: () => VNodeChild): VNodeChild =>
  slots[name]?.(props) ?? fallback()

const agentChatProps = {
  definition: { type: Object as PropType<ChatDefinition>, required: true },
  placeholder: { type: String, default: undefined },
  onComponentSelect: { type: Function as PropType<(event: ComponentSelectionEvent | ComponentInteractionEvent) => void>, default: undefined },
  actionConfirmationTtlMs: { type: Number, default: undefined },
  session: { type: Object as PropType<ChatSession>, default: undefined },
  theme: { type: Object as PropType<ChatThemeInput>, default: undefined },
} as const

const ChatBinding = defineComponent({
  name: 'AgentsKitChatBinding',
  props: {
    config: { type: Object as PropType<ChatDefinition['chat']>, required: true },
    onState: { type: Function as PropType<(chat: ChatReturn) => void>, required: true },
  },
  setup(props, { slots }) {
    const chat = useChat(props.config)
    watchEffect(() => { void chat.status; void chat.messages; props.onState(chat) })
    return () => slots.default?.({ chat })
  },
})

const AgentChatSession = defineComponent({
  name: 'AgentsKitChatSession',
  props: agentChatProps,
  slots: Object as SlotsType<AgentChatSlots>,
  setup(props, { slots }) {
    const session = resolveChatSession(props.definition, props.session)
    const sessionId = session.sessionId
    let activeChat = props.definition.chat
    let pendingChat = activeChat
    let messages = activeChat.initialMessages
    let status: ChatReturn['status'] = 'idle'
    let currentChat: ChatReturn | undefined
    const bindingRevision = ref(0)
    const actionError = ref<Error>()
    const editDraft = ref<{ readonly messageId: string, readonly content: string }>()
    const resolvedInstances = ref(new Set<string>())
    const confirmation = session.createConfirmation({
      ...(props.actionConfirmationTtlMs === undefined ? {} : { ttlMs: props.actionConfirmationTtlMs }),
      chat: {
        proposeToolCall: proposal => currentChat!.proposeToolCall(proposal),
        approve: id => currentChat!.approve(id),
        deny: (id, reason) => currentChat!.deny(id, reason),
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
      void (record ? confirmation.approve(record.token, sessionId) : currentChat!.approve(toolCallId)).catch(error => fail(error, 'Action approval failed.'))
    }
    const deny = (toolCallId: string, reason?: string): void => {
      const record = confirmation.getByToolCall(toolCallId)
      void (record ? confirmation.reject(record.token, sessionId, reason) : currentChat!.deny(toolCallId, reason)).catch(error => fail(error, 'Action rejection failed.'))
    }
    const runLifecycle = (operation: Promise<void>): void => {
      actionError.value = undefined
      void operation.catch(error => fail(error, 'Lifecycle operation failed.'))
    }
    const interactComponent = (event: ComponentInteractionEvent): void => {
      if (resolvedInstances.value.has(event.instanceId)) return
      resolvedInstances.value.add(event.instanceId)
      try { props.onComponentSelect?.(event) } catch (error) { fail(error, 'Component interaction callback failed.') }
    }

    const renderChat = (chat: ChatReturn): VNodeChild => {
      currentChat = chat
      const nativeSlots = slots as unknown as Slots
      const targets = getLifecycleTargets(chat.messages)
      const messages = chat.messages.map(message => {
        const candidate = message.role === 'assistant' && isComponentFrameCandidate(message.content)
        const decoded = candidate ? decodeComponentFrame(message.content) : undefined
        if (decoded?.ok) {
          const manifest = props.definition.components
          const resolved = manifest === undefined ? undefined : resolveComponentFrame(decoded.frame, manifest)
          const rendered = resolved?.ok
            ? decoded.frame.componentKey === 'choice-list'
              ? slot(nativeSlots, 'choiceList', { frame: decoded.frame, manifest, disabled: resolvedInstances.value.has(decoded.frame.instanceId), onSelect: (event: ComponentSelectionEvent) => selectComponent(event, decoded.frame) }, () => h(ChoiceList, { frame: decoded.frame, manifest: manifest!, disabled: resolvedInstances.value.has(decoded.frame.instanceId), onSelect: (event: ComponentSelectionEvent) => selectComponent(event, decoded.frame) }))
              : slot(nativeSlots, 'standardComponent', { frame: decoded.frame, manifest, disabled: resolvedInstances.value.has(decoded.frame.instanceId), onInteract: interactComponent }, () => h(StandardComponent, { frame: decoded.frame, manifest: manifest!, disabled: resolvedInstances.value.has(decoded.frame.instanceId), onInteract: interactComponent }))
            : h('p', { 'data-ak-component-fallback': '' }, formatSemanticFallback(decoded.frame.fallback))
          return h(Fragment, { key: message.id }, [rendered])
        }
        const rendered = decoded && !decoded.ok
          ? h('p', { role: 'alert', 'data-ak-component-diagnostic': decoded.diagnostic.code }, decoded.diagnostic.message)
          : slot(nativeSlots, 'message', { message }, () => h(Message, { message }))
        return h(Fragment, { key: message.id }, [rendered])
      })
      const confirmations = chat.messages.flatMap(message => message.toolCalls ?? []).map(toolCall =>
        h(Fragment, { key: toolCall.id }, [slot(nativeSlots, 'confirmation', { toolCall, onApprove: approve, onDeny: deny }, () => h(ToolConfirmation, { toolCall, onApprove: approve, onDeny: deny }))]))
      const content = [...messages, ...confirmations, slot(nativeSlots, 'thinking', { visible: chat.status === 'streaming' }, () => h(ThinkingIndicator, { visible: chat.status === 'streaming' }))]
      const container = slot(nativeSlots, 'container', { children: content }, () => h(ChatRoot, {}, { default: () => content }))
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
        slot(nativeSlots, 'input', { chat, disabled: chat.status === 'streaming', placeholder: props.placeholder }, () => h(InputBar, { chat, disabled: chat.status === 'streaming', ...(props.placeholder === undefined ? {} : { placeholder: props.placeholder }) })),
      ])
    }
    return () => {
      pendingChat = props.definition.chat
      if (activeChat !== pendingChat && status !== 'streaming') { activeChat = pendingChat; bindingRevision.value += 1 }
      const config = session.updateChat({ ...activeChat, ...(messages === undefined ? {} : { initialMessages: messages }) })
      return h(ChatBinding, {
        key: bindingRevision.value,
        config,
        onState: (chat: ChatReturn) => {
          currentChat = chat
          messages = chat.messages
          status = chat.status
          if (activeChat !== pendingChat && status !== 'streaming') { activeChat = pendingChat; bindingRevision.value += 1 }
        },
      }, { default: ({ chat }: { chat: ChatReturn }) => renderChat(chat) })
    }
  },
})

export const AgentChat = defineComponent({
  name: 'AgentsKitChat',
  props: agentChatProps,
  slots: Object as SlotsType<AgentChatSlots>,
  setup(props, { slots }) {
    return () => h(AgentChatSession, {
      ...props,
      key: `${props.definition.id}:${props.definition.revision ?? 1}:${props.session?.sessionId ?? 'new'}`,
    } as never, slots)
  },
})

export type { ChatDefinition } from '@agentskit/chat'
