---
title: Styling
description: Semantic theme tokens and native composition slots for AgentsKit Chat shells.
---

# Styling

Pass the same semantic theme to any application shell:

```ts
const theme = {
  colors: { accent: '#7c3aed', danger: '#dc2626' },
  spacing: { medium: 16 },
  radius: { large: 18 },
}
```

React, Vue, Svelte, Solid, Angular, React Native, and Ink application shells accept `theme`. Input is runtime validated, unknown tokens fail early, and missing tokens use accessible defaults.

## Capability map

| Intent | React | Vue | Svelte | Solid | Angular | React Native | Ink |
|---|---|---|---|---|---|---|---|
| colors | AgentsKit CSS variables | same CSS variables | same CSS variables | same CSS variables | same CSS variables | upstream wrapper/text styles | complete `InkTheme` |
| spacing | CSS variables | CSS variables | CSS variables | CSS variables | CSS variables | numeric native styles | unsupported |
| radius | CSS variables | CSS variables | CSS variables | CSS variables | CSS variables | native border radius | unsupported |
| font family | CSS stack/variable | CSS stack/variable | CSS stack/variable | CSS stack/variable | CSS stack/variable | native default/custom loaded family | unsupported |

The mapping helpers are public for host integration: React, Vue, Svelte, Solid, and Angular publish CSS-variable helpers; native and terminal publish `toChatNativeStyles` and `toChatInkTheme`.

## Native slots

React, React Native, and Ink accept a component slot map. Vue uses typed named scoped slots. Svelte uses typed Svelte 5 snippets. Solid uses typed render props named `container`, `message`, `input`, `thinking`, `confirmation`, and `choiceList`. Angular uses named content templates for `container`, `message`, `input`, `thinking`, `confirmation`, and `choiceList`. Composition is never serialized into `ChatDefinition`.

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
