# ChoiceList

`ChoiceList` is the first schema-backed application component. It presents one prompt and 1–20 choices, then emits the same `agentskit.chat.component` v1 selection event on every renderer.

## Typed actions

A choice may declare `{ action: { name: 'send-email', input: { to: 'ada@example.com' } } }`. The name resolves only through `ChatConfig.tools`. The tool must be executable, opt into `requiresConfirmation`, and pass the configured AgentsKit argument validator.

Selection proposes a canonical upstream tool call; it never executes the action. React, React Native, and Ink render the official AgentsKit confirmation component. For manual coordination, `createActionConfirmation` returns an expiring handle bound to session, action, validated input snapshot, and tool-call id. Approval and rejection are idempotent. The handle is correlation metadata, not authentication.

## Declare the manifest

```ts
import { ChoiceListComponent, defineComponentManifest } from '@agentskit/chat'

export const components = defineComponentManifest([ChoiceListComponent])
```

Only declared keys can render. `resolveComponentFrame(frame, components)` validates the envelope and the registered props schema. A failure returns `{ ok: false, diagnostic }`; it does not render or invoke an interaction callback.

## Render frame

```json
{
  "protocol": "agentskit.chat.component",
  "version": 1,
  "type": "render",
  "componentKey": "choice-list",
  "instanceId": "destination-choice",
  "props": {
    "prompt": "Where should we go?",
    "choices": [
      { "id": "docs", "label": "Documentation", "description": "Read the component guide." },
      { "id": "demo", "label": "Demo" }
    ]
  },
  "fallback": { "kind": "choice-list", "summary": "Choose Documentation or Demo." }
}
```

The frame may come from an agent response or a deterministic route. Treat both as untrusted input and resolve them before choosing a native renderer. Unsupported consumers display the fallback summary.

A choice may declare `action` for a policy-controlled side effect. Deterministic answer choices remain v1-compatible: they display the exact alias in `description`, while the host-provided `choiceSubmission` callback delegates authorization to the deterministic adapter that projected the frame. Every first-party AgentChat renderer submits the returned visible alias through the existing AgentsKit chat controller when no action exists. Authorization is exact and single-use, and the same callback event is emitted for observability. Model-authored or replayed generic choices cannot gain an automatic submission path by imitating an instance ID.

## Native renderers

- React: `<ChoiceList frame={frame} manifest={components} onSelect={handleSelect} />` uses a labelled fieldset and native buttons.
- Vue: `<ChoiceList ... />` uses the same labelled fieldset/native buttons and is replaceable through the typed `choiceList` scoped slot.
- Svelte: `<ChoiceList ... />` uses a labelled fieldset/native buttons and is replaceable through the typed `choiceList` snippet.
- Solid: `<ChoiceList ... />` uses a labelled fieldset/native buttons and is replaceable through the typed `choiceList` render prop.
- Angular: `<ak-choice-list ... />` uses a labelled fieldset/native buttons and is replaceable through the named `#choiceList` content template.
- React Native: `<ChoiceListNative ... />` exposes native accessibility roles and labels.
- Ink: `<ChoiceList ... />` supports Up/Down or a number followed by Enter.

Each `onSelect` callback receives `{ protocol, version, type: 'select', componentKey, instanceId, choiceId }`. A choice id not declared in the validated frame is rejected.

All application shells detect component frames in assistant messages (including deterministic route responses), resolve them against `definition.components`, and report the same selection event through `onComponentSelect`. A valid but unregistered component renders only its shared semantic fallback.

## Security

Never select a renderer from an unchecked model string. Resolve against the closed manifest first. Component selection expresses user intent only; it does not execute an action. Authorization, confirmation, and side effects belong to the action-policy issues.
