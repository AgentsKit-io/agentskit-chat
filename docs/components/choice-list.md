# ChoiceList

`ChoiceList` is the first schema-backed application component. It presents one prompt and 1–20 choices, then emits the same `agentskit.chat.component` v1 selection event on every renderer.

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

## Native renderers

- React: `<ChoiceList frame={frame} manifest={components} onSelect={handleSelect} />` uses a labelled fieldset and native buttons.
- React Native: `<ChoiceListNative ... />` exposes native accessibility roles and labels.
- Ink: `<ChoiceList ... />` supports Up/Down or a number followed by Enter.

Each `onSelect` callback receives `{ protocol, version, type: 'select', componentKey, instanceId, choiceId }`. A choice id not declared in the validated frame is rejected.

`AgentChat`, `AgentChatNative`, and the Ink `AgentChat` detect component frames in assistant messages (including deterministic route responses), resolve them against `definition.components`, and report selections through `onComponentSelect`. A valid but unregistered component renders only its semantic fallback.

## Security

Never select a renderer from an unchecked model string. Resolve against the closed manifest first. Component selection expresses user intent only; it does not execute an action. Authorization, confirmation, and side effects belong to the action-policy issues.
