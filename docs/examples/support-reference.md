# Support reference application

The support reference demonstrates a production-shaped path through one unchanged definition on React, React Native, and Ink:

```text
question → deterministic/provider answer
/support → semantic ChoiceList
Open support ticket → typed tool proposal
trusted host policy → confirmation
Approve → injected TicketService
```

The model cannot create tickets autonomously. It can propose `create-support-ticket`, but the action is registered with a strict JSON Schema, validated by `createAjvValidator`, authorized from host-owned context, and marked `requiresConfirmation`. Execution delegates to the injected service only after the upstream AgentsKit confirmation lifecycle approves it.

## Run locally

```bash
pnpm install
pnpm --filter @agentskit/chat-example-react dev
pnpm --filter @agentskit/chat-example-react-native dev
pnpm --filter @agentskit/chat-example-ink build
pnpm --filter @agentskit/chat-example-ink start
```

Ask any question to exercise deterministic test mode. Type `/support`, select **Open support ticket**, then approve. The bundled in-memory service returns `SUP-1`.

## Deterministic tests

```bash
pnpm --filter @agentskit/chat-example-shared test
pnpm test:e2e
pnpm test:pty
```

The shared unit suite injects a spy `TicketService` and proves it remains untouched before confirmation and after rejection. Browser and PTY suites complete the same flow through native controls.

## Real-provider mode

`createSupportApplication` accepts any published AgentsKit `AdapterFactory`:

```ts
import { createSupportApplication } from '@agentskit/chat-example-shared'

export const support = createSupportApplication({
  context: authenticatedRequestContext,
  adapter: providerAdapter,
  ticketService: productionTicketService,
})
```

Construct `providerAdapter` with the supported AgentsKit provider package used by your host. Keep credentials outside the definition. Create one definition and `ChatSession` per authenticated session so stable host context and policy session identity stay bound; never derive identity or capabilities from a prompt, component frame, or tool arguments.

## Persistence and deployment

For a deployed application, combine the definition with `createChatHandler` from `@agentskit/chat/server`, a durable `SessionStorage`, and an upstream `ChatMemory` adapter. The application session stores only AgentsKit Chat metadata; canonical messages remain in upstream memory. Replace the demo ticket service with a durable, transactional implementation. If retry-safe ticket creation is required, the host integration must supply and persist an application-specific idempotency key; this simplified service does not expose AgentsKit's internal tool-call identity.

Deploy the Web-standard handler behind host authentication. Forward request cancellation and deadlines, keep provider/ticket credentials server-side, and retain policy/action traces according to your audit requirements.

## Native evidence

- React: responsive support workspace with semantic buttons, alerts, focus rings, and lifecycle controls.
- React Native: safe-area layout, native accessibility roles, touch controls, and Expo web conformance.
- Ink: keyboard choice navigation, numbered confirmation, Escape cancellation, and Ctrl+C shutdown.

Terminal transcript:

```text
❯ /support
Would you like a human support specialist to follow up?
1. Open support ticket
2. Keep chatting

Allow create-support-ticket?
1. Yes  2. Yes, for session  3. No

create-support-ticket · complete
Ticket SUP-1 created for follow-up.
```

## Ownership walkthrough

`apps/example-shared` owns support-domain composition and injection seams. Renderer apps own presentation only. `@agentskit/chat` owns routes, policy composition, confirmation metadata, components, and sessions. AgentsKit owns controller lifecycle, typed tools, argument validation seam, confirmation execution, framework bindings, and memory.
