---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/react.md", "packages/react/fixtures/readme-example.tsx", "packages/react/package.json", "packages/react/src/index.tsx", "packages/react/tests/agent-chat.test.tsx", "packages/react/tests/controlled-agent-chat.test.tsx"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces]
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
| Consumidores | consumidores de exemplo descritos no grupo; consumidores externos não enumerados |
| Dependências | [[chat]], [[agentskit-react]] e runtime React |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias.

## Como mexer (para agentes)

- **Entrada:** `packages/react/src/index.tsx`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. Em modo controlado não chamar hook/store de aquisição de chat.
- **Testes:** `packages/react/tests/agent-chat.test.tsx`; packages/react/tests/controlled-agent-chat.test.tsx.
- **Validação:** `pnpm --filter @agentskit/chat-react lint && pnpm --filter @agentskit/chat-react test`.
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: 0001, 0008, 0013, 0015, 0019, 0031

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 6008093 controlled driver

> [!info]- Detalhe técnico
> `packages/react/src/index.tsx:323` declara o shell; `packages/react/fixtures/readme-example.tsx:1` fornece o exemplo; `packages/react/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
