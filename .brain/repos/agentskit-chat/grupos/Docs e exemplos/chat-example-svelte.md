---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente"
fontes: ["apps/example-shared/tests/support.test.ts", "apps/example-svelte/package.json", "apps/example-svelte/src/App.svelte", "docs/for-agents/apps/example-svelte.md"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos]
---

# @agentskit/chat-example-svelte

> [!tldr] Em linguagem comum
> Hospeda as mesmas referências compartilhadas em Svelte 5.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Hospeda as mesmas referências compartilhadas em Svelte 5. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/example-svelte/src/App.svelte:45` |

Exemplo real (`apps/example-svelte/src/App.svelte:45`):

```tsx
    <AgentChat definition={ragChat} session={ragSession} placeholder="Ask a grounded question" onComponentInteract={onRagInteract} />
  {:else if operations}
    <AgentChat definition={operationsApp.definition} session={operationsApp.session} placeholder="Type /operations to begin" />
  {:else if onboarding}
    <AgentChat
      definition={onboardingApplication.definition}
      session={onboardingApplication.session}
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat]]; [[chat-example-shared]] |
| Dependências | [[00 Hub - agentskit]] e workspace `@agentskit/chat` conforme manifesto. |

## Dados e efeitos

Lê módulos e fixtures locais. O host de docs pode expor HTTP e consultar serviço configurado; exemplos usam serviços em memória ou adapters injetados. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-svelte/src/App.svelte`.
- **Invariantes:** Lógica de domínio pertence ao módulo compartilhado.
- **Testes:** `apps/example-shared/tests/support.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-example-svelte build`.
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:1`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Framework-neutral core with native renderers]], [[agentskit-chat ADR-0030 - Certify ecosystem product chats through one application]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-svelte`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-svelte/src/App.svelte:5` — ponto de entrada citado; `apps/example-svelte/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-svelte.md:1` — handoff do app; `apps/example-shared/tests/support.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
