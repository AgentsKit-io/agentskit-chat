import type { AdapterFactory, StreamChunk } from '@agentskit/core'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Deterministic streaming adapter for docs examples (no network). */
export function createMockAdapter(responses: readonly string[], cps = 70): AdapterFactory {
  let i = 0
  return {
    createSource: () => ({
      stream: async function* (): AsyncIterableIterator<StreamChunk> {
        const text = responses[i % responses.length] ?? 'Hello from AgentsKit Chat.'
        i += 1
        for (const ch of text) {
          await sleep(1000 / cps)
          yield { type: 'text', content: ch }
        }
        yield { type: 'done' }
      },
      abort() {},
    }),
    capabilities: { streaming: true },
  }
}
