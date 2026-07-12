# Deterministic routes and conversation state

Add a `conversation` to the same definition already consumed by every renderer:

```ts
import { commandRoute, defineChat } from '@agentskit/chat'

const supportChat = defineChat({
  id: 'support',
  chat: { adapter },
  conversation: {
    initial: 'idle',
    states: {
      idle: { on: { start: 'collecting' }, actions: ['start'] },
      collecting: { on: { finish: 'complete' }, actions: ['cancel'] },
      complete: { actions: ['restart'] },
    },
    routes: [
      commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'What is your name?' }),
      commandRoute({ id: 'finish', command: '/name Ada', event: 'finish', states: ['collecting'], response: () => 'Welcome, Ada.' }),
    ],
  },
})
```

Routes run in declaration order before the model adapter. A route can run only when its event is allowed by the current state. Unknown input and state-disallowed routes delegate to the original AgentsKit adapter unchanged.

The session records deterministic decisions against upstream user-message identities. Retry and regenerate replay the same deterministic response; the next dispatch after an edit or truncation recomputes progress from retained history and removes stale decisions. Editing without regeneration does not itself transition the application machine. A failing matcher or response becomes a controller-owned error stream and does not advance state. Trace callbacks are observability-only and never block a turn.

`createChatSession(definition)` exposes the derived `chat` configuration and `getConversationSnapshot()`. The snapshot contains only the current state and its allowed events/actions. Create one session per user or mounted renderer; the built-in renderers do this automatically.

Use `onTrace` to observe decisions. Trace kinds distinguish `deterministic`, `agentic`, `repaired`, and `fallback` turns without copying prompt content into telemetry.

## Route identity context

Route response callbacks receive `(input, context)`. Use `context.messageId` when a rendered application component needs a deterministic identity that is unique per turn; use `context.sessionId` only as a fallback when no user message exists. Never use a process-global counter for replayed route output.
