---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/solid.md", "packages/solid/fixtures/readme-example.ts", "packages/solid/package.json", "packages/solid/src/index.tsx", "packages/solid/tests/agent-chat.test.tsx", "packages/solid/tests/protocol-conformance.test.tsx"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-solid

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em Solid, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em Solid, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat(props: AgentChatProps): JSX.Element` | componente | Shell nativo Solid | `packages/solid/src/index.tsx:155` |
| `StandardComponent` | componente (reexportado de `./StandardComponent.js`) | Projeta frame validado | `packages/solid/src/index.tsx:10` |

Exemplo real (`packages/solid/fixtures/readme-example.ts`):

```ts
import { AgentChat } from '@agentskit/chat/solid'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Workspace `private` (`packages/solid/package.json:53`): publicado como o subpath `@agentskit/chat/solid` por `scripts/assemble-chat-package.mjs`; [[chat-example-solid]] (`apps/example-solid/src/App.tsx:1`) e o [[chat-cli]] importam esse subpath |
| Dependências | [[chat]] e `@agentskit/core` (`packages/solid/package.json:34-37`); peers [[agentskit-solid]] `^0.4.4` e `solid-js ^1.9.0` |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias. Evidência: `useChat` vem de `@agentskit/solid` (`packages/solid/src/index.tsx:5,50`).

## Como mexer (para agentes)

- **Entrada:** `packages/solid/src/index.tsx`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).
- **Testes:** `packages/solid/tests/agent-chat.test.tsx`, `packages/solid/tests/protocol-conformance.test.tsx`.
- **Validação:** `pnpm --filter @agentskit/chat-solid lint && pnpm --filter @agentskit/chat-solid test` (`packages/solid/package.json:31-32`; `test` compila `@agentskit/chat` antes).
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]], [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/solid/src/index.tsx:155` declara o shell; `packages/solid/fixtures/readme-example.ts:1` fornece o exemplo; `packages/solid/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
