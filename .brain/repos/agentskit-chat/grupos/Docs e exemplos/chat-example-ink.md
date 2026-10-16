---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
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
| `render(...)` | entrada do app (Ink `render`) | Escolhe entre exemplo controlado (`ControlledInkExample`), RAG, operações, onboarding ou suporte conforme a variável de ambiente `AK_EXAMPLE` (`controlled`, `rag`, `operations`, `onboarding`; ausente = suporte; lidas em `:7-10`) | `apps/example-ink/src/index.tsx:11` |

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
| Consumidores | Nenhum workspace; é exercitado por `pnpm test:pty` (script da raiz, `package.json:15`) |
| Dependências | [[chat]] (subpath `@agentskit/chat/ink`, `apps/example-ink/src/index.tsx:2` — não depende do workspace [[chat-ink]]), [[chat-example-shared]] (`:1`), [[agentskit-ink]], `ink ^7.1.0` (`apps/example-ink/package.json:12-18`); `node-pty` em devDependencies |

## Dados e efeitos

Lê a variável de ambiente `AK_EXAMPLE` (só o nome é citado). Sem outro I/O além do terminal: usa as aplicações em memória de [[chat-example-shared]] e escreve links de fonte em `process.stdout` (`index.tsx:11-14`). O teste PTY abre um pseudoterminal real. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-ink/src/index.tsx`.
- **Invariantes:** Suite PTY verifica fluxo, cancelamento Escape (`apps/example-ink/tests/ink-pty.test.ts:92`) e saída Ctrl+C (`:119`).
- **Testes:** `apps/example-ink/tests/ink-pty.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-example-ink lint && pnpm test:pty` — `test:pty` compila protocol, chat, devtools e chat-ink, monta o pacote (`assemble-chat-package.mjs ink`), compila o app e roda o vitest PTY (`apps/example-ink/package.json:10`).
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:19`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework]], [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-ink`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-ink/src/index.tsx:1` — ponto de entrada citado; `apps/example-ink/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-ink.md:1` — handoff do app; `apps/example-ink/tests/ink-pty.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
