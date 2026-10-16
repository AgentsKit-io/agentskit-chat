---
tipo: pacote
repo: agentskit-chat
grupo: Núcleo e protocolo
camada: ferramenta
visibilidade: publico
npm: "@agentskit/chat"
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/chat.md", "packages/chat/fixtures/readme-example.ts", "packages/chat/package.json", "packages/chat/src/deterministic.ts", "packages/chat/src/drizzle-pg.ts", "packages/chat/src/index.ts", "packages/chat/tests/define-chat.test.ts", "packages/chat/tests/deterministic.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/nucleo-e-protocolo, camada/ferramenta]
---

# @agentskit/chat

> [!tldr] Em linguagem comum
> Define comportamento de aplicação, rotas determinísticas, políticas, componentes e sessões sobre o ChatConfig do AgentsKit.

← [[00 Grupo - agentskit-chat - Núcleo e protocolo]]

## O que faz e por que existe

Define comportamento de aplicação, rotas determinísticas, políticas, componentes e sessões sobre o ChatConfig do AgentsKit. Não implementar controller, reducer, lifecycle, tool execution ou transições genéricas; mensagens canônicas ficam em ChatMemory upstream. Frames só são aceitos após manifest/schema; ações exigem política e confirmação.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `defineChat(definition)` | função | Preserva a definição tipada | `packages/chat/src/index.ts:555` |
| `createChatSession(definition, options?)` | função | Projeta sessão local e rotas | `packages/chat/src/index.ts:690` |
| `createDeterministicAnswerResolver(artifact, options)` | função | Busca exata limitada em artefato verificado; artefato inválido devolve escalada `corrupt` | `packages/chat/src/deterministic.ts:53` |
| `createDeterministicAnswerAdapter(options)` | função | Adapter que tenta o resolver local antes do adapter de backend | `packages/chat/src/deterministic.ts:300` |
| `resumeChatSession(definition, options)` | função | Retoma sessão salva; compara identidade/revisão | `packages/chat/src/index.ts:961` |
| `SessionConflictError` | classe | Lançada quando `storage.save` recusa o cursor esperado | `packages/chat/src/index.ts:599` |
| `chatSessionTable` / `chatDecisionTable` | tabelas Drizzle | Subpath `@agentskit/chat/drizzle-pg` | `packages/chat/src/drizzle-pg.ts:11`, `:61` |

Exemplo real (`packages/chat/fixtures/readme-example.ts:1-7`):

```ts
import { defineChat } from '@agentskit/chat'
import type { AdapterFactory } from '@agentskit/core'

export const createSupportChat = (adapter: AdapterFactory) => defineChat({
  id: 'support',
  chat: { adapter },
})

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat-server]] (`packages/server/src/index.ts:5` importa `resumeChatSession`), [[chat-devtools]] (`packages/devtools/src/index.ts:2`, tipos), [[chat-cli]] (`packages/cli/src/index.ts:4`, `STANDARD_COMPONENT_KEYS`), os shells de renderer ([[chat-react]], [[chat-vue]], …) e os apps de exemplo (`@agentskit/chat/<renderer>`) |
| Dependências | [[chat-protocol]] (importado em `packages/chat/src/index.ts:20`, embutido pelo build — `devDependency` workspace); [[00 Hub - agentskit]]: `@agentskit/core` (peer), `@agentskit/statechart` (`index.ts:3`), `@agentskit/memory/web-storage` (`ask.ts:2`); Zod; `drizzle-orm` e `@agentskit/observability` são peers opcionais. Subpaths públicos (`./protocol`, `./server`, `./devtools`, `./react`…`./angular`, `./drizzle-pg`) em `packages/chat/package.json:19` |

## Dados e efeitos

Lê definição e mensagens do AgentsKit; session storage opcional lê/grava envelope de sessão e decisões. `drizzle-pg` escreve tabelas `agentskit_chat_sessions` e `agentskit_chat_decisions` (`packages/chat/src/drizzle-pg.ts:11`). Sem variável de ambiente própria confirmada.

## Como mexer (para agentes)

- **Entrada:** `packages/chat/src/index.ts`.
- **Invariantes:** Não implementar controller, reducer, lifecycle, tool execution ou transições genéricas; mensagens canônicas ficam em ChatMemory upstream. Frames só são aceitos após manifest/schema; ações exigem política e confirmação.
- **Testes:** `packages/chat/tests/define-chat.test.ts` (definição/sessão), `packages/chat/tests/deterministic.test.ts`, `packages/chat/tests/ask.test.ts`, `packages/chat/tests/controlled-driver.test.ts`, `packages/chat/tests/presentation.test.ts`, `packages/chat/tests/drizzle-pg.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat lint && pnpm --filter @agentskit/chat test` — `lint` = `tsc --noEmit`; `test` compila `@agentskit/chat-protocol` e roda `vitest run --coverage` (`packages/chat/package.json:90-91`). Contrato de storage Postgres: `pnpm test:storage:pg` (raiz).
- **Armadilhas:** Não adicionar busca semântica/fuzzy; rota é avaliada na ordem declarada.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0002 - Upstream primeiro e sem reimplementação]], [[agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework]], [[agentskit-chat ADR-0006 - Conversa determinística por sessão]], [[agentskit-chat ADR-0011 - Metadados de sessão da aplicação sobre o ChatMemory]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0018 - Rotas determinísticas recebem identidade estável de turno]], [[agentskit-chat ADR-0019 - Observadores de confirmação de sessão isolados]], [[agentskit-chat ADR-0023 - Transições da conversa usam o statechart do AgentsKit]], [[agentskit-chat ADR-0024 - Respostas determinísticas antes dos adapters de backend]], [[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]], [[agentskit-chat ADR-0036 - Envelopes de sessão da aplicação em Drizzle-Postgres]], [[agentskit-chat ADR-0038 - Partes referenciadas entregues na fronteira do adapter]].

Histórico recente do caminho: 2026-10-10 · 6723cd7 decisões persistentes/custo/parts; 2026-10-07 · 19cac25 storage Drizzle/Postgres CAS; 2026-10-07 · 97a3915 parts/upload; 2026-10-02 · 76be79b primitivas de rede; 2026-07-14 · 6008093 driver controlado.

> [!info]- Detalhe técnico
> `packages/chat/src/index.ts:555` exporta `defineChat`; `packages/chat/src/drizzle-pg.ts:11` define tabelas; `packages/chat/src/deterministic.ts:53` inicia resolver.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
