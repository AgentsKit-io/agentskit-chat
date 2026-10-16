---
tipo: pacote
repo: agentskit-chat
grupo: Interfaces
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; ownership/validação consultados no doc-bridge.config.json; índice não disponível e CLI não executável (pnpm ausente); auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["docs/architecture/upstream-adoption.md", "docs/for-agents/packages/angular.md", "packages/angular/fixtures/readme-example.ts", "packages/angular/package.json", "packages/angular/src/index.ts", "packages/angular/tests/agent-chat.test.ts", "packages/angular/tests/package-aot.test.ts"]
tags: [pacote, repo/agentskit-chat, grupo/interfaces, camada/ferramenta]
---

# @agentskit/chat-angular

> [!tldr] Em linguagem comum
> Apresenta a conversa AgentsKit em Angular, conservando a definição compartilhada e os componentes nativos.

← [[00 Grupo - agentskit-chat - Interfaces]]

## O que faz e por que existe

Apresenta a conversa AgentsKit em Angular, conservando a definição compartilhada e os componentes nativos. Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChatComponent implements OnChanges, OnDestroy` | componente | Shell Angular | `packages/angular/src/index.ts:83` |
| `ChoiceListComponent` | componente | Seleção especializada | `packages/angular/src/index.ts:35` |

Exemplo real (`packages/angular/fixtures/readme-example.ts`):

```ts
import { AgentChatComponent } from '@agentskit/chat/angular'

```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Workspace `private` (`packages/angular/package.json:61`), compilado com ng-packagr (`:30`) e publicado como o subpath `@agentskit/chat/angular` (`packages/chat/package.json:74-78`) por `scripts/assemble-chat-package.mjs:27-35`, que reescreve o import de `@agentskit/chat` para o caminho relativo. Não há app de exemplo Angular neste repo; o [[chat-cli]] gera projetos Angular |
| Dependências | [[chat]], `@agentskit/core`, `tslib` (`packages/angular/package.json:34-38`); peers [[agentskit-angular]] `^0.4.6`, `@angular/core` e `@angular/common` `>=18.1 <22`, `rxjs ^7` |

## Dados e efeitos

Recebe definição, sessão e frames serializáveis; delega estado, lifecycle, streaming, cancelamento e confirmação ao binding upstream. Não declara persistência, variáveis de ambiente, rede ou permissões próprias. Evidência: usa `AgentskitChat` e os componentes de `@agentskit/angular` (`packages/angular/src/index.ts:3`).

## Como mexer (para agentes)

- **Entrada:** `packages/angular/src/index.ts`.
- **Invariantes:** Preservar UI nativa, validar frame via manifest comum e emitir eventos de intenção. Não duplicar controller, lifecycle ou confirmation. O modo controlado ([[agentskit-chat ADR-0031 - Chat controlado externamente como costura da aplicação]]) existe só em React e Ink; este renderer não o implementa (nenhuma ocorrência de "controlled" em `src/`).
- **Testes:** `packages/angular/tests/agent-chat.test.ts`, `packages/angular/tests/package-aot.test.ts` (compila o pacote), `packages/angular/tests/protocol-conformance.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-angular lint && pnpm --filter @agentskit/chat-angular test` — `test` compila protocol, chat e o próprio pacote antes de rodar vitest (`packages/angular/package.json:31-32`).
- **Armadilhas:** Não deixar o binding upstream e o shell divergirem; executar testes de protocolo comuns.
- **Adoção upstream:** revisar o contrato descrito em `docs/architecture/upstream-adoption.md`; AgentsKit fornece os primitivos e este módulo apenas os compõe.

## Decisões e história

ADRs: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream]], [[agentskit-chat ADR-0013 - Temas semânticos da aplicação e slots nativos]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]], [[agentskit-chat ADR-0029 - Renderizadores como subcaminhos do Chat]]

Histórico recente do caminho: 2026-10-10 · 4891be6 release 0.6.0; 2026-10-02 · 0bfd034 cobertura; 2026-07-14 · 40ee0fd consolidação

> [!info]- Detalhe técnico
> `packages/angular/src/index.ts:83` declara o shell; `packages/angular/fixtures/readme-example.ts:1` fornece o exemplo; `packages/angular/package.json:1` declara peer e scripts.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
