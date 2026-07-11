# Theming and native composition

Pass the same semantic theme to any application shell:

```ts
const theme = {
  colors: { accent: '#7c3aed', danger: '#dc2626' },
  spacing: { medium: 16 },
  radius: { large: 18 },
}
```

React, Vue, React Native, and Ink application shells accept `theme`. Input is runtime validated, unknown tokens fail early, and missing tokens use accessible defaults.

## Capability map

| Intent | React | Vue | React Native | Ink |
|---|---|---|---|---|
| colors | AgentsKit CSS variables | the same upstream CSS variables on `ChatRoot` | upstream wrapper and text style seams plus native application styles | complete upstream `InkTheme` |
| spacing | CSS variables | CSS variables | numeric native layout styles | unsupported by terminal layout |
| radius | CSS variables | CSS variables | native border radius | unsupported |
| font family | `system` maps to the platform CSS stack; a custom name maps to the upstream variable | the same CSS stack/variable mapping | `system` preserves the native default; a loaded custom family maps through upstream message/input text seams and native application text | unsupported |

The mapping helpers are public for host integration: React and Vue publish `toChatCssVariables`; native and terminal publish `toChatNativeStyles` and `toChatInkTheme`.

## Native slots

React, React Native, and Ink accept a `slots` component map for `Container`, `Message`, `Input`, `Thinking`, `Confirmation`, and `ChoiceList`. Vue follows its native convention with named scoped slots `container`, `message`, `input`, `thinking`, `confirmation`, and `choiceList`; their payloads are published through `AgentChatSlots`/`SlotsType`. Slots are never serialized into `ChatDefinition`.

```tsx
<AgentChat definition={chat} slots={{ Message: BrandedMessage }} theme={theme} />
```

Defaults provide live-region announcements, labeled controls, alerts, native button behavior, and one active Ink keyboard owner. A replacement slot must preserve equivalent accessibility and keyboard semantics.

## Fully headless state

Use the upstream binding directly when no default shell is wanted:

```ts
import { useChat } from '@agentskit/react' // or vue / react-native / ink
const state = useChat(definition.chat)
```

Vue headless consumers import the same `useChat` contract from `@agentskit/vue`.

AgentsKit remains the owner of streaming, messages, tools, memory, retry/edit/regenerate, and cancellation. AgentsKit Chat does not wrap or reproduce that hook.
