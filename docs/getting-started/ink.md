# Ink quick start

Install the application shell and its published upstream peers:

```bash
pnpm add @agentskit/chat @agentskit/chat/ink @agentskit/ink ink react
```

Define the chat in a framework-neutral module and render it from an Ink entry point:

```tsx
import { defineChat } from '@agentskit/chat'
import { AgentChat } from '@agentskit/chat/ink'
import { render } from 'ink'

import { adapter } from './adapter.js'

const chat = defineChat({ id: 'support', chat: { adapter } })

render(<AgentChat definition={chat} />)
```

When a trusted terminal host already owns the session, pass the same
framework-neutral controlled source used by React:

```tsx
import type { ControlledChatSource } from '@agentskit/chat'
import { AgentChat } from '@agentskit/chat/ink'

export const mountChat = (source: ControlledChatSource) =>
  render(<AgentChat definition={chat} controlled={source} />)
```

Controlled mode validates the serialized snapshot and delegates input,
cancellation, lifecycle commands, confirmation, and component interactions to
the host callbacks. It does not invoke the upstream `useChat` hook or create a
second controller. The official Ink input, Escape cancellation, confirmation,
theme, semantic fallback, and single-owner keyboard behavior remain unchanged.

The host must rerender with its next snapshot after a callback and remains
responsible for authentication, authorization, transport, persistence, and
business behavior.

The shell delegates lifecycle, streaming, input history, Escape cancellation, and terminal components to `@agentskit/ink`. Validate unsupported visual output with `parseSemanticFallback` from `@agentskit/chat`, then render it with Ink's `SemanticFallback`; the shared formatter keeps its kind and readable summary stable across platforms.

