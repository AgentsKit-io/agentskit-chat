---
'@agentskit/chat': minor
---

Breaking: `createAskAdapter` no longer defaults to the retired hosted Ask
service (`ask.agentskit.io`). `AskAdapterOptions.endpoint` is now required and
`createAskAdapter` throws a clear error when it is missing or blank.

Migration: pass the Ask service URL you deploy, or a same-origin path served
by your backend, for example `createAskAdapter({ endpoint: '/api/ask', corpus: 'docs' })`.
