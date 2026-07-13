const decoder = new TextDecoder()

export const withAbort = async <T>(operation: Promise<T> | T, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) throw signal.reason
  let rejectAbort: ((reason?: unknown) => void) | undefined
  const abort = (): void => rejectAbort?.(signal.reason)
  const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject })
  signal.addEventListener('abort', abort, { once: true })
  try { return await Promise.race([Promise.resolve(operation), aborted]) }
  finally { signal.removeEventListener('abort', abort) }
}

export const readBoundedJson = async (
  request: Request,
  maxBodyBytes: number,
  signal: AbortSignal,
  fail: (status: number, code: string, message: string) => never,
): Promise<unknown> => {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBodyBytes) fail(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
  const reader = request.body?.getReader()
  if (!reader) return fail(400, 'REQUEST_INVALID_JSON', 'Request body is not valid JSON.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const result = await withAbort(reader.read(), signal)
      if (result.done) break
      size += result.value.byteLength
      if (size > maxBodyBytes) {
        await reader.cancel()
        return fail(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
      }
      chunks.push(result.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(decoder.decode(bytes)) as unknown }
  catch { return fail(400, 'REQUEST_INVALID_JSON', 'Request body is not valid JSON.') }
}
