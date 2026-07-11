import type { AdapterFactory } from '@agentskit/core'
import { describe, expect, it } from 'vitest'

import { defineChat, formatSemanticFallback, parseSemanticFallback } from '../src/index.js'

const adapter: AdapterFactory = {
  createSource: () => ({
    async *stream() {
      yield { type: 'done' }
    },
    abort() {},
  }),
}

describe('defineChat', () => {
  it('preserves the definition and upstream ChatConfig reference', () => {
    const chat = { adapter }
    const definition = defineChat({ id: 'support', chat })

    expect(definition).toEqual({ id: 'support', chat })
    expect(definition.chat).toBe(chat)
  })
})

describe('semantic fallback', () => {
  it('validates and formats a framework-neutral fallback', () => {
    const fallback = parseSemanticFallback({ kind: 'chart', summary: 'Revenue rose 12%.' })
    expect(formatSemanticFallback(fallback)).toBe('[unsupported visual: chart] Revenue rose 12%.')
  })

  it('rejects empty fallback fields at the runtime boundary', () => {
    expect(() => parseSemanticFallback({ kind: '', summary: 'Missing kind.' })).toThrow()
  })
})
