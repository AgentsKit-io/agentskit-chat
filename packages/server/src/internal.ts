import { NetError, NetErrorCodes, readJson } from '@agentskit/net'

/** Preserves the server's declared and streamed request-size boundary while using the published bounded JSON reader. */
export const readBoundedJson = async (
  request: Request,
  maxBodyBytes: number,
  signal: AbortSignal,
  fail: (status: number, code: string, message: string) => never,
): Promise<unknown> => {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBodyBytes) fail(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
  try {
    const body = request.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>(), { signal }) ?? null
    return await readJson(new Response(body, { headers: request.headers }), { maxBytes: maxBodyBytes })
  } catch (error) {
    if (error instanceof NetError && error.code === NetErrorCodes.AK_NET_BODY_TOO_LARGE) {
      return fail(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
    }
    if (error instanceof SyntaxError) return fail(400, 'REQUEST_INVALID_JSON', 'Request body is not valid JSON.')
    throw error
  }
}
