# Theming and native composition

Pass the same semantic theme to any application shell:

```ts
const theme = {
  colors: { accent: '#7c3aed', danger: '#dc2626' },
  spacing: { medium: 16 },
  radius: { large: 18 },
}
```

`AgentChat`, `AgentChatNative`, and the Ink `AgentChat` accept `theme`. Input is runtime validated, unknown tokens fail early, and missing tokens use accessible defaults.

## Capability map

| Intent | React | React Native | Ink |
|---|---|---|---|
| colors | AgentsKit CSS variables | upstream wrapper and text style seams plus native application styles | complete upstream `InkTheme` |
| spacing | CSS variables | numeric native layout styles | unsupported by terminal layout |
| radius | CSS variables | native border radius | unsupported |
| font family | upstream CSS variable | upstream message/input text seams plus native application text | unsupported |

The mapping helpers are public for host integration: `toChatCssVariables`, `toChatNativeStyles`, and `toChatInkTheme`.

## Native slots

Each renderer accepts `slots` for `Container`, `Message`, `Input`, `Thinking`, `Confirmation`, and `ChoiceList`. Slot types use that renderer's native React, React Native, or Ink component contract; they are never serialized into `ChatDefinition`.

```tsx
<AgentChat definition={chat} slots={{ Message: BrandedMessage }} theme={theme} />
```

Defaults provide live-region announcements, labeled controls, alerts, native button behavior, and one active Ink keyboard owner. A replacement slot must preserve equivalent accessibility and keyboard semantics.

## Fully headless state

Use the upstream binding directly when no default shell is wanted:

```ts
import { useChat } from '@agentskit/react' // or react-native / ink
const state = useChat(definition.chat)
```

AgentsKit remains the owner of streaming, messages, tools, memory, retry/edit/regenerate, and cancellation. AgentsKit Chat does not wrap or reproduce that hook.
