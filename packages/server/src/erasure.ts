import { withTimeout } from '@agentskit/net'

/** Every category of chat data a tenant owns. All are erased by one `eraseTenantChatData` call. */
export const TENANT_CHAT_DATA_CATEGORIES = ['sessions', 'decisions', 'memory', 'cost'] as const
export type TenantChatDataCategory = typeof TENANT_CHAT_DATA_CATEGORIES[number]

/**
 * Host-owned eraser of one category. It removes every record of `tenant`, and only that tenant's,
 * returning how many were removed. It must be idempotent: a retried erasure removes what remains.
 */
export type TenantDataEraser = (tenant: string, signal: AbortSignal) => number | Promise<number>

export interface EraseTenantChatDataOptions {
  readonly tenant: string
  /** Session snapshots (`SessionStorage`). */
  readonly sessions: TenantDataEraser
  /** Action decisions (`ToolDecisionStore`). */
  readonly decisions: TenantDataEraser
  /** Chat transcripts (`ChatMemory`). */
  readonly memory: TenantDataEraser
  /** Spend windows, reservations, and usage ledger rows (`CostStore`). */
  readonly cost: TenantDataEraser
  /** Deadline for each eraser. Default 30 seconds. */
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

export interface TenantErasureReceipt {
  readonly tenant: string
  readonly erased: Readonly<Record<TenantChatDataCategory, number>>
}

/** Thrown when an eraser fails; the other categories still ran, and a retry is safe. */
export class TenantErasureError extends Error {
  readonly tenant: string
  readonly failed: readonly TenantChatDataCategory[]
  readonly erased: Readonly<Partial<Record<TenantChatDataCategory, number>>>
  constructor(tenant: string, failed: readonly TenantChatDataCategory[], erased: Partial<Record<TenantChatDataCategory, number>>, causes: readonly unknown[]) {
    super(`Erasure of tenant chat data failed for: ${failed.join(', ')}.`, { cause: new AggregateError(causes) })
    this.name = 'TenantErasureError'; this.tenant = tenant; this.failed = failed; this.erased = erased
  }
}

/**
 * Erases all chat data of one tenant (data-subject erasure): sessions, decisions, memory, and cost records.
 * Every category runs even when another fails. Refuse new turns for the tenant before calling, or a turn
 * in flight can write again after its category was erased.
 */
export const eraseTenantChatData = async (options: EraseTenantChatDataOptions): Promise<TenantErasureReceipt> => {
  const { tenant } = options
  if (typeof tenant !== 'string' || !tenant.trim() || tenant.length > 256) throw new TypeError('A non-empty tenant ID of at most 256 characters is required.')
  const timeoutMs = options.timeoutMs ?? 30_000
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be a positive integer.')
  for (const category of TENANT_CHAT_DATA_CATEGORIES) {
    if (typeof options[category] !== 'function') throw new TypeError(`An eraser for ${category} is required.`)
  }
  const { signal } = options
  signal?.throwIfAborted()
  const results = await Promise.allSettled(TENANT_CHAT_DATA_CATEGORIES.map(category => withTimeout(async callbackSignal => {
    const count = await options[category](tenant, callbackSignal)
    if (!Number.isSafeInteger(count) || count < 0) throw new TypeError(`The ${category} eraser must return a non-negative integer count.`)
    return count
  }, timeoutMs, signal)))
  const erased: Partial<Record<TenantChatDataCategory, number>> = {}
  const failed: TenantChatDataCategory[] = []
  const causes: unknown[] = []
  results.forEach((result, index) => {
    const category = TENANT_CHAT_DATA_CATEGORIES[index]!
    if (result.status === 'fulfilled') erased[category] = result.value
    else { failed.push(category); causes.push(result.reason) }
  })
  if (failed.length > 0) throw new TenantErasureError(tenant, failed, erased, causes)
  return { tenant, erased: erased as Record<TenantChatDataCategory, number> }
}
