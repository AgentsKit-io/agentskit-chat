export { default as AgentChat } from './AgentChat.svelte'
export { default as ChoiceList } from './ChoiceList.svelte'
export type { AgentChatProps, ChoiceListProps } from './types.js'
export type { ChatDefinition } from '@agentskit/chat'

import { resolveChatTheme } from '@agentskit/chat'
import type { ChatThemeInput } from '@agentskit/chat'

export type ChatCssVariables = Readonly<Record<`--ak-${string}`, string | number>>
export const toChatCssVariables = (input?: ChatThemeInput): ChatCssVariables => {
  const theme = resolveChatTheme(input)
  return {
    '--ak-color-bg': theme.colors.background, '--ak-color-surface': theme.colors.surface, '--ak-color-border': theme.colors.border,
    '--ak-color-text': theme.colors.text, '--ak-color-text-muted': theme.colors.muted, '--ak-color-bubble-user': theme.colors.accent,
    '--ak-color-bubble-user-text': theme.colors.onAccent, '--ak-color-bubble-assistant': theme.colors.surface, '--ak-color-bubble-assistant-text': theme.colors.text,
    '--ak-color-input-bg': theme.colors.background, '--ak-color-input-border': theme.colors.border, '--ak-color-input-focus': theme.colors.accent,
    '--ak-color-button': theme.colors.accent, '--ak-color-button-text': theme.colors.onAccent, '--ak-color-tool-bg': theme.colors.surface,
    '--ak-color-tool-border': theme.colors.border, '--ak-app-color-danger': theme.colors.danger,
    '--ak-font-family': theme.fontFamily === 'system' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : theme.fontFamily,
    '--ak-radius': `${theme.radius.medium}px`, '--ak-radius-lg': `${theme.radius.large}px`, '--ak-spacing-sm': `${theme.spacing.small}px`,
    '--ak-spacing-md': `${theme.spacing.medium}px`, '--ak-spacing-lg': `${theme.spacing.large}px`,
  }
}

export const toChatStyle = (input?: ChatThemeInput): string => Object.entries(toChatCssVariables(input)).map(([key, value]) => `${key}:${value}`).join(';')
