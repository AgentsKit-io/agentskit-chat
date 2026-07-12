# Standard component catalog

Import the complete closed manifest when an application accepts every standard component:

```ts
import { StandardComponentCatalog, defineComponentManifest } from '@agentskit/chat'

export const components = defineComponentManifest(StandardComponentCatalog)
```

The v0 catalog contains ButtonGroup, ChoiceList, Form, Confirmation, Progress, SourceList, LinkCard, ErrorNotice, ToolCall, ApprovalRequest, Table, and FileAttachment. Each exported `*Component` definition includes its strict Zod schema, declared events, accessibility contract, capabilities, and fallback builder. Individual `*PropsSchema` exports support authoring and tests.

Interactive components emit a validated `ComponentInteractionEvent` with `type: 'interact'`, an event name, and its declared value. ChoiceList retains the compatible `ComponentSelectionEvent`. Events describe user intent only: hosts decide navigation and downloads, while tool effects continue through AgentsKit authorization and confirmation.

Connect both host callbacks on any shell. `onComponentSelect` remains exclusive to ChoiceList for backward compatibility; `onComponentInteract` receives form, action, navigation, and download intents:

```tsx
<AgentChat
  definition={definition}
  onComponentSelect={event => handleChoice(event.choiceId)}
  onComponentInteract={event => handleComponentIntent(event)}
/>
```

The same callback names apply to React Native, Ink, Vue, Svelte, Solid, and Angular. Callback effects are host-owned; a synchronous callback failure leaves the component active so the user can retry.

Unknown keys, invalid props, undeclared events, unsafe URLs, and non-JSON values are inert. URLs are limited to relative paths or HTTP(S). Collections and text are bounded at the schema boundary.

See the [generated parity report](./catalog.generated.md) for renderer support. Regenerate it with `pnpm catalog:report`.

## Custom components

Use `defineComponentManifest` with your own stable key and strict props schema. Optional metadata follows the same shape as the standard catalog. A custom native renderer belongs in each framework package or host slot; never serialize framework components into `ChatDefinition`.
