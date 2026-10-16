---
tipo: app
repo: agentskit-chat
grupo: Docs e exemplos
camada: ferramenta
visibilidade: privado
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "análise estática no HEAD; routing/ownership consultado em doc-bridge.config.json; CLI doc-bridge indisponível por pnpm ausente; auditado em 2026-10-16 (referências e símbolos conferidos contra o código)"
fontes: ["apps/example-vue/package.json", "apps/example-vue/src/App.vue", "docs/for-agents/apps/example-vue.md", "tests/e2e/vue-support.spec.ts"]
tags: [app, repo/agentskit-chat, grupo/docs-e-exemplos, camada/ferramenta]
---

# @agentskit/chat-example-vue

> [!tldr] Em linguagem comum
> Hospeda as mesmas referências compartilhadas em Vue.

← [[00 Grupo - agentskit-chat - Docs e exemplos]]

## O que faz e por que existe

Hospeda as mesmas referências compartilhadas em Vue. A propriedade separa apresentação de contratos e domínio, usando exemplos para demonstrar composição real.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentChat` | exportação/entrada demonstrativa | Composição real do host ou definição | `apps/example-vue/src/App.vue:59` |

Exemplo real (`apps/example-vue/src/App.vue:59`):

```tsx
    <AgentChat
      v-if="rag"
      :definition="ragChat"
      :session="ragSession"
      placeholder="Ask a grounded question"
      :on-component-interact="onRagInteract"
    />
```

## Quem usa e do que depende

| Relação | Notas e evidência |
|---|---|
| Consumidores | Nenhum workspace; é alvo do e2e `pnpm test:e2e --project=vue` (`playwright.config.ts:36`) |
| Dependências | [[chat]] (subpath `@agentskit/chat/vue`, `apps/example-vue/src/App.vue:2` — não depende do workspace [[chat-vue]]) e [[chat-example-shared]] (`apps/example-vue/package.json:13`) |

## Dados e efeitos

Sem I/O próprio: usa as aplicações em memória de [[chat-example-shared]]. Nenhum segredo ou valor de ambiente é registrado nesta nota.

## Como mexer (para agentes)

- **Entrada:** `apps/example-vue/src/App.vue`.
- **Invariantes:** Manter paridade sem portar lógica de domínio para o host.
- **Testes:** `tests/e2e/vue-support.spec.ts` (o app não tem script `test` próprio).
- **Validação:** `pnpm --filter @agentskit/chat-example-vue build && pnpm test:e2e --project=vue` (`build` = `vue-tsc --noEmit … && vite build`, `apps/example-vue/package.json:7`).
- **Armadilhas:** manter a fonte canônica de domínio em example-shared; não afirmar deploy a partir de configuração local.
- **Adoção upstream:** compor pacotes publicados; gaps genéricos pertencem ao AgentsKit conforme `AGENTS.md:19`.

## Decisões e história

ADRs relacionados: [[agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos]], [[agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação]]. Para histórico detalhado, `git log --oneline -15 -- apps/example-vue`; commits relevantes visíveis neste checkout incluem `4891be6` (release 0.6.0) e `6723cd7` (políticas de decisão e conteúdo referenciado).

> [!info]- Detalhe técnico
> `apps/example-vue/src/App.vue:59` — primeiro `<AgentChat>`; `apps/example-vue/package.json:1` — dependências e scripts; `docs/for-agents/apps/example-vue.md:1` — handoff do app; `tests/e2e/vue-support.spec.ts:1` — cobertura relacionada.

> [!question] Dúvida
> O repositório não declara um revisor responsável por este pacote/app em CODEOWNERS; validar o reviewer na governança da mudança.
