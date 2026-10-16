---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["apps/example-shared/package.json", "apps/example-shared/src/index.ts", "apps/example-shared/tests/support.test.ts", "docs/for-agents/apps/example-shared.md"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos, camada/ferramenta]
---

# @agentskit/chat-example-shared

> [!tldr] Em linguagem comum
> Define exemplos de suporte, onboarding, operações protegidas e RAG de modo independente de framework.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Define exemplos de suporte, onboarding, operações protegidas e RAG de modo independente de framework. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createSupportApplication` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/example-shared/src/index.ts:98` |

Exemplo real (`apps/example-shared/src/index.ts:98`):

```tsx
export const createSupportApplication = ({ context, ticketService, adapter = deterministicAdapter }: SupportApplicationOptions) => {
  const createTicket = defineTool({
    name: 'create-support-ticket', description: 'Create a support ticket after user confirmation.', schema: ticketSchema, requiresConfirmation: true,
    execute: async input => {
      const ticket = await ticketService.createTicket({ subject: input.subject, priority: input.priority as TicketInput['priority'] }, context)
      return `Ticket ${ticket.id} created for follow-up.`
    },
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | [[chat-example-react]], [[chat-example-vue]], [[chat-example-svelte]], [[chat-example-solid]], [[chat-example-react-native]] e [[chat-example-ink]] (todos declaram `@agentskit/chat-example-shared: workspace:*` em `package.json:13`) |
| Dependências | [[chat]] (`workspace:*`); [[00 Hub - agentskit]]: `@agentskit/core`, `@agentskit/rag`, `@agentskit/validation` (`apps/example-shared/package.json:9-14`) |

## Dados e efeitos

Sem I/O próprio: os domínios de suporte, onboarding, operações e RAG usam serviços em memória ou injetados pelo host (`ticketService`, `adapter` em `createSupportApplication`, `apps/example-shared/src/index.ts:98`). Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-shared/src/index.ts`.
- **Invariantes:** Não importar DOM, React ou Expo; dados de demonstração são fixtures locais.
- **Testes:** `apps/example-shared/tests/support.test.ts`.
- **Validação:** `pnpm --filter @agentskit/chat-example-shared lint && pnpm --filter @agentskit/chat-example-shared test` (`apps/example-shared/package.json:16-17`; o `test` compila `@agentskit/chat` antes e roda `vitest run --coverage`).
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:19`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0009 - Política de capability confiável compõe a autorização do upstream]], [[agentskit-chat ADR-0024 - Respostas determinísticas antes dos adapters de backend]], [[agentskit-chat ADR-0026 - Vertical confiável de backend do Ask]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-shared`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-shared/src/index.ts:98` — ponto de entrada citado; `apps/example-shared/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-shared.md:1` — handoff do app; `apps/example-shared/tests/support.test.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
