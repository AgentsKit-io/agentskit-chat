---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente"
fontes: ["apps/example-react/package.json", "apps/example-react/src/App.tsx", "docs/for-agents/apps/example-react.md", "tests/e2e/chat-conformance.ts"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos]
---

# @agentskit/chat-example-react

> [!tldr] Em linguagem comum
> Inicializa o shell React para executar as definições compartilhadas de exemplo.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Inicializa o shell React para executar as definições compartilhadas de exemplo. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/example-react/src/App.tsx:17` |

Exemplo real (`apps/example-react/src/App.tsx:17`):

```tsx
      ? <AgentChat definition={ragChat} session={ragSession} onComponentInteract={event => { const url = ragChat.resolveSourceInteraction(event); if (url) window.open(url, '_blank', 'noopener,noreferrer') }} placeholder="Ask a grounded question" />
      : operations
      ? <AgentChat definition={operationsApp.definition} session={operationsApp.session} placeholder="Type /operations to begin" />
      : onboarding
      ? <AgentChat definition={onboardingApplication.definition} session={onboardingApplication.session} onComponentInteract={onboardingApplication.onComponentInteract} onComponentSelect={onboardingApplication.onComponentSelect} placeholder="Type /onboarding to begin" />
      : <AgentChat definition={supportChat} session={supportSession} placeholder="Ask support or type /support" />}
  </main>
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat]]; [[chat-react]] |
| Dependências | [[00 Hub - agentskit]] e workspace `@agentskit/chat` conforme manifesto. |

## Dados e efeitos

Lê módulos e fixtures locais. O host de docs pode expor HTTP e consultar serviço configurado; exemplos usam serviços em memória ou adapters injetados. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-react/src/App.tsx`.
- **Invariantes:** Comportamento de domínio pertence ao example-shared.
- **Testes:** `tests/e2e/chat-conformance.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-example-react build && pnpm test:e2e --project=react`.
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:1`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Framework-neutral core with native renderers]], [[agentskit-chat ADR-0030 - Certify ecosystem product chats through one application]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-react`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-react/src/App.tsx:2` — ponto de entrada citado; `apps/example-react/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-react.md:1` — handoff do app; `tests/e2e/chat-conformance.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
