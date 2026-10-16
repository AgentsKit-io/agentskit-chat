---
tipo: pacote
repo: agentskit-chat
grupo: Núcleo e protocolo
camada: ferramenta
visibilidade: publico
npm: "@agentskit/chat"
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/chat.md", "packages/chat/fixtures/readme-example.ts", "packages/chat/package.json", "packages/chat/src/deterministic.ts", "packages/chat/src/drizzle-pg.ts", "packages/chat/src/index.ts", "packages/chat/tests/define-chat.test.ts", "packages/chat/tests/deterministic.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/nucleo-e-protocolo]
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
| `createDeterministicAnswerResolver(options)` | função | Busca exata limitada em artefato | `packages/chat/src/deterministic.ts:53` |

Exemplo real (`packages/chat/fixtures/readme-example.ts:4`):

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
| Consumidores | [[chat-react]], [[chat-server]], [[chat-protocol]], [[chat-cli]] |
| Dependências | [[00 Hub - agentskit]] (Core, statechart, memory, observability); Zod; subpaths internos conforme `packages/chat/package.json:19` |

## Dados e efeitos

Lê definição e mensagens do AgentsKit; session storage opcional lê/grava envelope de sessão e decisões. `drizzle-pg` escreve tabelas `agentskit_chat_sessions` e `agentskit_chat_decisions` (`packages/chat/src/drizzle-pg.ts:11`). Sem variável de ambiente própria confirmada.

## Como mexer (para agentes)

- **Entrada:** `packages/chat/src/index.ts`.
- **Invariantes:** Não implementar controller, reducer, lifecycle, tool execution ou transições genéricas; mensagens canônicas ficam em ChatMemory upstream. Frames só são aceitos após manifest/schema; ações exigem política e confirmação.
- **Testes:** `packages/chat/tests/define-chat.test.ts`; packages/chat/tests/deterministic.test.ts.
- **Validação:** `pnpm --filter @agentskit/chat lint && pnpm --filter @agentskit/chat test`.
- **Armadilhas:** Não adicionar busca semântica/fuzzy; rota é avaliada na ordem declarada.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0002 - Upstream-first and no reimplementation]], [[agentskit-chat ADR-0003 - Framework-neutral semantic fallback envelope]], [[agentskit-chat ADR-0006 - Session-scoped deterministic conversation]], [[agentskit-chat ADR-0011 - Application session metadata over AgentsKit ChatMemory]], [[agentskit-chat ADR-0015 - Closed standard application component catalog]], [[agentskit-chat ADR-0018 - Deterministic routes receive stable turn identity]], [[agentskit-chat ADR-0019 - Session confirmation observers are isolated]], [[agentskit-chat ADR-0023 - Conversation transitions use AgentsKit statechart]], [[agentskit-chat ADR-0024 - Deterministic answers precede backend adapters]], [[agentskit-chat ADR-0031 - Treat externally controlled chat as an application seam]], [[agentskit-chat ADR-0036 - Drizzle-Postgres application session envelopes]], [[agentskit-chat ADR-0038 - Referenced parts are delivered at the adapter boundary]].

Histórico recente do caminho: 2026-10-10 · 6723cd7 decisões persistentes/custo/parts; 2026-10-07 · 19cac25 storage Drizzle/Postgres CAS; 2026-10-07 · 97a3915 parts/upload; 2026-10-02 · 76be79b primitivas de rede; 2026-07-14 · 6008093 driver controlado.

> [!info]- Detalhe técnico
> `packages/chat/src/index.ts:555` exporta `defineChat`; `packages/chat/src/drizzle-pg.ts:11` define tabelas; `packages/chat/src/deterministic.ts:53` inicia resolver.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
