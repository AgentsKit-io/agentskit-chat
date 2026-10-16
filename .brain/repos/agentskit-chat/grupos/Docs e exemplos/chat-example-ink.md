---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: f0840fb }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente"
fontes: ["apps/example-ink/package.json", "apps/example-ink/src/index.tsx", "apps/example-ink/tests/ink-pty.test.ts", "docs/for-agents/apps/example-ink.md"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos, camada/ferramenta]
---

# @agentskit/chat-example-ink

> [!tldr] Em linguagem comum
> Prova terminal executável dos mesmos fluxos de suporte, onboarding, operações e RAG.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Prova terminal executável dos mesmos fluxos de suporte, onboarding, operações e RAG. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `render(controlled` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/example-ink/src/index.tsx:11` |

Exemplo real (`apps/example-ink/src/index.tsx:11`):

```tsx
render(controlled
  ? <ControlledInkExample />
  : rag
  ? <AgentChat definition={ragChat} session={ragSession} onComponentInteract={event => { const url = ragChat.resolveSourceInteraction(event); if (url) process.stdout.write(`
Source: ${url}
`) }} placeholder="Ask a grounded question" />
  : operations
  ? <AgentChat definition={operationsApplication.definition} session={operationsApplication.session} placeholder="Type /operations to begin" />
  : onboarding
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat]]; [[chat-example-shared]] |
| Dependências | [[00 Hub - agentskit]] e workspace `@agentskit/chat` conforme manifesto. |

## Dados e efeitos

Lê módulos e fixtures locais. O host de docs pode expor HTTP e consultar serviço configurado; exemplos usam serviços em memória ou adapters injetados. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-ink/src/index.tsx`.
- **Invariantes:** Suite PTY verifica fluxo, cancelamento Escape e saída Ctrl+C.
- **Testes:** `apps/example-ink/tests/ink-pty.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-example-ink lint && pnpm test:pty`.
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:1`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-ink`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-ink/src/index.tsx:1` — ponto de entrada citado; `apps/example-ink/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-ink.md:1` — handoff do app; `apps/example-ink/tests/ink-pty.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
