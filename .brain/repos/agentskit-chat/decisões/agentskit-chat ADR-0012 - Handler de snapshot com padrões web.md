---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0012-web-standard-snapshot-handler.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0012 - Handler de snapshot com padrões web

> [!tldr] Em linguagem comum
> O servidor do chat é uma função `Request → Response` que roda em Node, serverless e edge, autentica antes de ler o corpo e responde com snapshots em linhas JSON.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0012-web-standard-snapshot-handler.md`.

## Decisão em linguagem comum

`createChatHandler` devolve `(Request) => Promise<Response>`; aceita eventos `client.turn.submit` validados e transmite eventos `server.turn.snapshot` codificados em NDJSON com `ReadableStream`. A autenticação roda antes do parse do corpo e seu contexto confiável só vai aos resolvers de definição e storage. O handler carrega/salva mensagens via `ChatMemory`, retoma metadados por `SessionStorage` CAS, cria o `ChatController` upstream e projeta snapshots; nunca transporta `StreamChunk`. Persistência é obrigatória: antes de criar o controlador reivindica um lease de turno ativo expirável por CAS, com histórico terminal limitado (janela de 64 turnos) contra replay sequencial; o lease cobre o pedido e a limpeza; snapshots pendentes são coalescidos sob backpressure. O sinal do pedido combina com `AbortSignal.timeout`; abort e cancelamento do stream chamam `controller.stop()`; falhas de borda devolvem JSON de diagnóstico seguro e versionado.

## Contexto e consequências

**Contexto.** Definições precisam de uma fronteira de servidor portável; o AgentsKit já é dono do controlador, adapters, tools, memória e cancelamento. Rejeitados: handlers por framework (Next/Express), stream direto de chunks, store de mensagens próprio e autenticação embutida. A seam cancelável de `ChatMemory` veio do AgentsKit #1155/#1156 (Core 1.12.2).

**Consequências.**

- Adaptadores de host são pontes finas de request.
- Snapshots completos usam mais banda que deltas, mas dão reconexão determinística.
- Hosts devem prover storage de sessão com CAS atômico.
- A janela de 64 turnos é proteção contra replay da aplicação, não exatamente-uma-vez à prova de crash; ferramentas com efeito colateral precisam de chave de idempotência própria.

## Pacotes afetados

[[chat-server]] (`createChatHandler`, `packages/server/src/index.ts:96`), [[chat]] (sessão/storage), [[chat-protocol]] (eventos).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0012-web-standard-snapshot-handler.md`.
