---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/vue.md", "packages/vue/fixtures/readme-example.ts", "packages/vue/package.json", "packages/vue/src/index.ts", "packages/vue/tests/agent-chat.test.ts", "packages/vue/tests/protocol-conformance.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-vue

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em Vue, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em Vue, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat: defineComponent({...})` | componente | Shell Vue | `packages/vue/src/index.ts:265` |
| `StandardComponent` | componente (reexportado de `./StandardComponent.js`) | Renderiza frames validados | `packages/vue/src/index.ts:10` |

Exemplo real (`packages/vue/fixtures/readme-example.ts`):

```ts
import { AgentChat } from '@agentskit/chat/vue'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Workspace `private` (`packages/vue/package.json:49`): publicado como o subpath `@agentskit/chat/vue` por `scripts/assemble-chat-package.mjs`; [[chat-example-vue]] (`apps/example-vue/src/App.vue:2`) e o [[chat-cli]] importam esse subpath |
| Dependências | [[chat]] (`workspace:*`); peers [[agentskit-vue]] `^0.4.4` e `vue ^3.4.0` (`packages/vue/package.json:37-40`) |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias. Evidência: `useChat` vem de `@agentskit/vue` (`packages/vue/src/index.ts:5,115`).

## Como mexer (para agentes)

- **Entrada:** `packages/vue/src/index.ts`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).
- **Testes:** `packages/vue/tests/agent-chat.test.ts`, `packages/vue/tests/protocol-conformance.test.ts`; e2e do exemplo: `tests/e2e/vue-support.spec.ts` via `pnpm test:e2e --project=vue` (`playwright.config.ts:36`).
- **Validação:** `pnpm --filter @agentskit/chat-vue lint && pnpm --filter @agentskit/chat-vue test` (`packages/vue/package.json:31-32`; `test` compila `@agentskit/chat` antes).
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]], [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/vue/src/index.ts:265` declara o shell (`StandardComponent` é reexportado em `:10`); `packages/vue/fixtures/readme-example.ts:1` fornece o exemplo; `packages/vue/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
