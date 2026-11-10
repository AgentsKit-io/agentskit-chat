import { describe, expect, it } from 'vitest'
import * as upstream from '@agentskit/chat/drizzle-pg'
import * as standalone from '../src/index'

describe('@agentskit/chat-drizzle-pg', () => {
  it('re-exports the same API as @agentskit/chat/drizzle-pg', () => {
    expect(Object.keys(standalone).sort()).toEqual(Object.keys(upstream).sort())
    expect(typeof standalone.createDrizzleSessionStorage).toBe('function')
    expect(typeof standalone.migrateChatSchema).toBe('function')
  })
})
