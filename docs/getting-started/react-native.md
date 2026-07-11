# React Native

Install `@agentskit/chat`, `@agentskit/chat-react-native`, `@agentskit/react-native`, React,
and React Native. Native dependencies belong to the Expo application, not the renderer package.

```tsx
import { AgentChatNative } from '@agentskit/chat-react-native'
import { helloWorldChat } from '@agentskit/chat-example-shared'

export default function App() {
  return <AgentChatNative definition={helloWorldChat} />
}
```

The renderer consumes `@agentskit/react-native` directly. The shared definition contains no DOM,
React web, Expo, or React Native imports. Version `0.3.4` or newer is required so active streams
are cancelled when their owning native screen unmounts.
