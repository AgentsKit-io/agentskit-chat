---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/react.md", "packages/react/fixtures/readme-example.tsx", "packages/react/package.json", "packages/react/src/index.tsx", "packages/react/tests/agent-chat.test.tsx", "packages/react/tests/controlled-agent-chat.test.tsx"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-react

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em React, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em React, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat(props: AgentChatProps): ReactElement` | componente | Shell nativo React | `packages/react/src/index.tsx:323` |
| `StandardComponent` | componente | Projeta frame validado | `packages/react/src/index.tsx:103` |

Exemplo real (`packages/react/fixtures/readme-example.tsx`):

```ts
import { AgentChat } from '@agentskit/chat/react'
import type { ChatDefinition } from '@agentskit/chat'

export const App = ({ definition }: { readonly definition: ChatDefinition }) =>
  <AgentChat definition={definition} placeholder="Ask a question" />

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Workspace `private`: ninguém depende dele pelo nome. `scripts/assemble-chat-package.mjs:7-25` copia `packages/react/dist` para `packages/chat/dist/renderers/react` e o código chega aos usuários como `@agentskit/chat/react` (`packages/chat/package.json:45`); [[chat-example-react]] (`apps/example-react/src/App.tsx:1`) e os templates do [[chat-cli]] importam esse subpath |
| Dependências | [[chat]] (`workspace:*`, `packages/react/package.json:34-36`); peers [[agentskit-react]] `>=0.7.1 <1` e `react >=18` |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias. Evidência: `useChat` vem de `@agentskit/react` (`packages/react/src/index.tsx:13,298`); o modo controlado usa `createControlledChatDriver` (`:1`).

## Como mexer (para agentes)

- **Entrada:** `packages/react/src/index.tsx`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.
- **Testes:** `packages/react/tests/agent-chat.test.tsx`, `packages/react/tests/controlled-agent-chat.test.tsx`, `packages/react/tests/protocol-conformance.test.tsx`; e2e do exemplo: `pnpm test:e2e --project=react` (`playwright.config.ts:34`).
- **Validação:** `pnpm --filter @agentskit/chat-react lint && pnpm --filter @agentskit/chat-react test` — `test` compila protocol e chat antes e roda vitest em happy-dom (`packages/react/package.json:31-32`).
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]], [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0019 - Observadores de confirmação de sessão isolados]], [[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 6008093 controlled driver

> [!info]- Detalhe técnico
> `packages/react/src/index.tsx:323` declara o shell; `packages/react/fixtures/readme-example.tsx:1` fornece o exemplo; `packages/react/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
