---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0015-standard-component-catalog.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação

> [!tldr] Em linguagem comum
> O Chat publica 12 componentes prontos (formulário, aprovação, progresso, fontes, tabela, anexo, avisos…), todos validados e com acessibilidade e fallback definidos.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0015-standard-component-catalog.md`.

## Decisão em linguagem comum

`@agentskit/chat` publica 12 definições de componente imutáveis; cada uma tem schema estrito de props, nomes de interação e formato de valor declarados, contrato de acessibilidade, lista de capabilities e construtor de fallback semântico (metadados de catálogo são opcionais para definições personalizadas, mantendo compatibilidade). `@agentskit/chat-protocol` acrescenta o evento v1 `interact` ao lado do `select` do ChoiceList; o manifesto fechado valida o frame e o evento declarado antes de emitir a interação. Componentes só de exibição não declaram eventos. Interações expressam intenção; autorização, confirmação, navegação e downloads são do host. Cada renderer expõe uma superfície genérica de componente padrão mais o ChoiceList especializado; declarações de suporte geram o relatório de paridade e as fixtures de conformidade exercitam cada entrada.

## Contexto e consequências

**Contexto.** A ADR-0007 criou o manifesto fechado; uma base cross-framework agora precisa de semântica mais rica (formulários, aprovações, progresso, fontes, tabelas, anexos, avisos de status) sem estender nem copiar a UI generativa do AgentsKit. Rejeitados: estender `UIElement`, 12 APIs independentes por renderer e tratar tudo como texto formatado.

**Consequências.**

- Schemas e eventos continuam neutros e validados em runtime.
- Visuais permanecem nativos, com paridade checada mecanicamente.
- Efeitos disparados por interações são do host.
- Um novo componente padrão exige metadados, fixtures, apresentação em todos os renderers, documentação e regeneração da paridade numa só mudança.

## Pacotes afetados

[[chat]] (`STANDARD_COMPONENT_KEYS`, catálogo), [[chat-protocol]], todos os renderers (cada um com `catalog-support.json` e `StandardComponent`); documentação em `docs/components/` e `docs/components/catalog.generated.md`.

## Substitui / substituído por

Estende a [[agentskit-chat ADR-0007 - Manifesto fechado de componentes da aplicação]]; o CLI da [[agentskit-chat ADR-0016 - CLI de sete renderizadores e geração semântica de componentes]] recusa nomes reservados do catálogo.

## Fonte

`docs/architecture/adrs/0015-standard-component-catalog.md`.
