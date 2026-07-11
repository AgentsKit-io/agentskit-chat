# Ink quick start

Install the application shell and its published upstream peers:

```bash
pnpm add @agentskit/chat @agentskit/chat-ink @agentskit/ink ink react
```

Define the chat in a framework-neutral module and render it from an Ink entry point:

```tsx
import { defineChat } from '@agentskit/chat'
import { AgentChat } from '@agentskit/chat-ink'
import { render } from 'ink'

import { adapter } from './adapter.js'

const chat = defineChat({ id: 'support', chat: { adapter } })

render(<AgentChat definition={chat} />)
```

The shell delegates lifecycle, streaming, input history, Escape cancellation, and terminal components to `@agentskit/ink`. Render unsupported visual components with `SemanticFallback` so terminal users receive a stable kind and readable summary.
