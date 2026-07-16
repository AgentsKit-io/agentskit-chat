---
title: Style the chat
description: Theme tokens and native composition slots for AgentsKit Chat shells.
---

# Style the chat

Semantic theme tokens travel with the definition; each renderer maps them to native CSS or platform styles.

```ts
import { resolveChatTheme } from '@agentskit/chat'

const theme = resolveChatTheme({
  colors: {
    accent: '#6157ff',
    background: '#0d1117',
    surface: '#161b22',
    text: '#e6edf3',
  },
})
```

Pass theme into the shell (renderer-specific prop) or override slots:

- **React / RN** — replace `Container`, `Message`, `Input` slots
- **Vue** — named scoped slots
- **Svelte** — snippets
- **Angular** — content templates
- **Ink** — semantic text fallbacks stay usable without graphics

Deep reference: [Theming and composition](/docs/theming-and-composition).
