# React Native

Install `@agentskit/chat`, `@agentskit/chat/react-native`, `@agentskit/react-native`, React,
and React Native. Native dependencies belong to the Expo application, not the renderer package.

```tsx
import { AgentChatNative } from '@agentskit/chat/react-native'
import { chat } from './chat'

export default function App() {
  return <AgentChatNative definition={chat} />
}
```

```ts
// chat.ts
import { defineChat } from '@agentskit/chat'
import { adapter } from './adapter'

export const chat = defineChat({ id: 'hello-world', chat: { adapter } })
```

The Expo example in this repository keeps its deterministic shared fixture private because it is
test infrastructure, not a published API.

The renderer consumes `@agentskit/react-native` directly. The shared definition contains no DOM,
React web, Expo, or React Native imports. Version `0.4.4` or newer is required; the release is
tested against the published `0.4.x` line for cancellation, native accessibility, and bundle safety.

