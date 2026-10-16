---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["apps/example-shared/tests/support.test.ts", "apps/example-solid/package.json", "apps/example-solid/src/App.tsx", "docs/for-agents/apps/example-solid.md"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos, camada/ferramenta]
---

# @agentskit/chat-example-solid

> [!tldr] Em linguagem comum
> Hospeda as mesmas referências compartilhadas em Solid.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Hospeda as mesmas referências compartilhadas em Solid. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/example-solid/src/App.tsx:37` |

Exemplo real (`apps/example-solid/src/App.tsx:37`):

```tsx
        <AgentChat definition={ragChat} session={ragSession} placeholder="Ask a grounded question" onComponentInteract={event => {
          const url = ragChat.resolveSourceInteraction(event)
          if (url) window.open(url, '_blank', 'noopener,noreferrer')
        }} />
      </Match>
      <Match when={operations}>
        <AgentChat definition={operationsApp.definition} session={operationsApp.session} placeholder="Type /operations to begin" />
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Nenhum workspace; não há projeto Playwright para ele em `playwright.config.ts:33-38` |
| Dependências | [[chat]] (subpath `@agentskit/chat/solid`, `apps/example-solid/src/App.tsx:1` — não depende do workspace [[chat-solid]]) e [[chat-example-shared]] (`apps/example-solid/package.json:13`) |

## Dados e efeitos

Sem I/O próprio: usa as aplicações em memória de [[chat-example-shared]]. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-solid/src/App.tsx`.
- **Invariantes:** Lógica de domínio pertence ao módulo compartilhado.
- **Testes:** o app não tem teste próprio; o domínio é coberto por `apps/example-shared/tests/support.test.ts` e a compilação por `build`.
- **Validação:** `pnpm --filter @agentskit/chat-example-solid build` (`tsc --noEmit && vite build`, `apps/example-solid/package.json:7`).
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:19`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-solid`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-solid/src/App.tsx:37` — primeiro `<AgentChat>` (`export const App` em `:22`); `apps/example-solid/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-solid.md:1` — handoff do app; `apps/example-shared/tests/support.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
