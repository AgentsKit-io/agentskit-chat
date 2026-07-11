import { ChoiceListComponent, commandRoute, createCapabilityPolicy, defineChat, defineComponentManifest, withActionPolicy } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

const deterministicAdapter: AdapterFactory = {
  createSource: request => {
    let aborted = false
    let release: (() => void) | undefined
    return {
      async *stream() {
        const prompt = request.messages.filter(message => message.role === 'user').at(-1)?.content ?? ''
        if (prompt === '/fail') {
          yield { type: 'error', content: 'The deterministic adapter failed as requested.' }
          return
        }
        if (prompt === '/slow') await new Promise<void>(resolve => { release = resolve })
        if (!aborted) yield { type: 'text', content: `AgentsKit received: ${prompt}` }
        if (!aborted) yield { type: 'done' }
      },
      abort() {
        aborted = true
        release?.()
      },
    }
  },
}

export const helloWorldChat = defineChat({
  id: 'hello-world',
  components: defineComponentManifest([ChoiceListComponent]),
  chat: withActionPolicy({
    adapter: deterministicAdapter,
    tools: [{ name: 'restricted-action', requiresConfirmation: true, execute: () => undefined }],
  }, createCapabilityPolicy({
    sessionId: 'example', getContext: () => undefined, requirements: { 'restricted-action': ['example.restricted'] },
  })),
  conversation: {
    initial: 'idle',
    states: {
      idle: { on: { start: 'collecting', restricted: 'idle' }, actions: ['start', 'restricted'] },
      collecting: { on: { finish: 'complete' }, actions: ['cancel'] },
      complete: { actions: ['restart'] },
    },
    routes: [
      commandRoute({ id: 'start', command: '/start', event: 'start', response: () => 'What is your name?' }),
      commandRoute({ id: 'finish', command: '/name Ada', event: 'finish', states: ['collecting'], response: () => 'Welcome, Ada.' }),
      commandRoute({
        id: 'restricted', command: '/restricted', event: 'restricted', response: () => JSON.stringify({
          protocol: 'agentskit.chat.component', version: 1, type: 'render', componentKey: 'choice-list', instanceId: 'restricted-choice',
          props: { prompt: 'Restricted action', choices: [{ id: 'run', label: 'Run restricted action', action: { name: 'restricted-action', input: {} } }] },
          fallback: { kind: 'choice-list', summary: 'Restricted action is unavailable.' },
        }),
      }),
    ],
  },
})
