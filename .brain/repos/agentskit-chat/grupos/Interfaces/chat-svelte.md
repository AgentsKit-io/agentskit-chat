---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/svelte.md", "packages/svelte/fixtures/readme-example.ts", "packages/svelte/package.json", "packages/svelte/src/index.ts", "packages/svelte/tests/agent-chat.test.ts", "packages/svelte/tests/ssr.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-svelte

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em Svelte 5, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em Svelte 5, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat: Component<AgentChatProps>` | componente | Shell Svelte | `packages/svelte/src/AgentChat.svelte.d.ts:3` |
| `toChatCssVariables(input?)` | função | Tema semântico | `packages/svelte/src/index.ts:11` |

Exemplo real (`packages/svelte/fixtures/readme-example.ts`):

```ts
import { AgentChat } from '@agentskit/chat/svelte'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Workspace `private` (`packages/svelte/package.json:53`): publicado como o subpath `@agentskit/chat/svelte` (`packages/chat/package.json:69-73`); [[chat-example-svelte]] (`apps/example-svelte/src/App.svelte:2`) e o [[chat-cli]] importam esse subpath |
| Dependências | [[chat]] e `@agentskit/core` (`packages/svelte/package.json:34-37`); peers [[agentskit-svelte]] `^0.4.4` e `svelte ^5.0.0` |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias. Evidência: usa `SvelteChatStore` e os componentes de `@agentskit/svelte` (`packages/svelte/src/AgentChatSession.svelte:2`).

## Como mexer (para agentes)

- **Entrada:** `packages/svelte/src/index.ts` (reexporta `AgentChat.svelte`, `ChoiceList.svelte`, `StandardComponent.svelte`); a lógica do shell está em `packages/svelte/src/AgentChat.svelte` e `AgentChatSession.svelte`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).
- **Testes:** `packages/svelte/tests/agent-chat.test.ts`, `packages/svelte/tests/protocol-conformance.test.ts`, `packages/svelte/tests/ssr.test.ts` (config separada `vitest.ssr.config.ts`).
- **Validação:** `pnpm --filter @agentskit/chat-svelte lint && pnpm --filter @agentskit/chat-svelte test` — aqui `lint` é `svelte-check` e `test` compila `@agentskit/chat` e o próprio pacote (`svelte-package`) antes de rodar os dois vitest (`packages/svelte/package.json:30-32`).
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]], [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/svelte/src/index.ts:1` declara o shell; `packages/svelte/fixtures/readme-example.ts:1` fornece o exemplo; `packages/svelte/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
