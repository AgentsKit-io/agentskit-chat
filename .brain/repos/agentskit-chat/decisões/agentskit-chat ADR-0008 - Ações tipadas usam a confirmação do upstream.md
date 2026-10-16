---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0008-typed-actions-use-upstream-confirmation.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0008 - Ações tipadas usam a confirmação do upstream

> [!tldr] Em linguagem comum
> Uma ação com efeito colateral escolhida na tela passa pela confirmação e pela execução do AgentsKit; o Chat só amarra a confirmação à sessão.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0008-typed-actions-use-upstream-confirmation.md`.

## Decisão em linguagem comum

Uma escolha acionável de `ChoiceList` carrega `{ name, input }` e é enviada à API `ChatReturn.proposeToolCall` do AgentsKit; só ferramentas registradas, executáveis e com `requiresConfirmation` viram chamadas pendentes, e o `ArgsValidator` upstream valida e congela os argumentos. `createActionConfirmation` amarra um handle opaco ao id da sessão, ao id canônico da tool call, ao nome da ação, ao snapshot de argumentos e a uma expiração absoluta; aprovação e rejeição reivindicam o registro local antes de delegar exclusivamente a `approve`/`deny` do AgentsKit; repetições devolvem o registro terminal; a expiração delega negação e nunca executa. Os renderers usam o `ToolConfirmation` oficial. O handle é correlação/idempotência, não autenticação.

## Contexto e consequências

**Contexto.** Uma escolha determinística pode representar intenção com efeito colateral; o AgentsKit já é dono do registro de tools, validação, estado canônico, UI de confirmação e execução exatamente uma vez. A lacuna upstream foi resolvida na issue #1144 / PR #1145 (`@agentskit/core@1.11.0`).

**Consequências.**

- Execução e validação de tools ficam em uma só fonte (AgentsKit).
- Todos os renderers de prova compartilham um ciclo de vida neutro.
- Registros de confirmação em memória são por sessão (a recuperação durável veio depois, ADR-0011/0037).
- Uma aprovação reivindicada nunca é repetida automaticamente após falha upstream.

## Pacotes afetados

[[chat]] (`createActionConfirmation`), [[chat-react]], [[chat-react-native]], [[chat-ink]] (renderizam `ToolConfirmation` upstream).

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0008-typed-actions-use-upstream-confirmation.md`.
