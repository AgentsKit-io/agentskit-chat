---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0001-cross-framework-core.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0001 - Núcleo neutro de framework com renderizadores nativos

> [!tldr] Em linguagem comum
> O comportamento do chat é definido uma vez, sem depender de nenhum framework, e cada interface (React, Vue, Ink…) é um adaptador nativo.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-10. Fonte: `docs/architecture/adrs/0001-cross-framework-core.md`.

## Decisão em linguagem comum

Definições de chat, eventos de turno, ações, políticas, manifestos de componentes, estado de conversa, sessões e fixtures de compatibilidade são neutros de framework e validados em tempo de execução. Cada renderer é um adaptador nativo sobre o binding correspondente do AgentsKit; componentes personalizados compartilham identidade, schema de props, ações e fallback semântico, mas a implementação visual pode variar. React, React Native e Ink são os alvos de prova iniciais; os demais seguem o contrato validado.

## Contexto e consequências

**Contexto.** O AgentsKit já suporta React, Vue, Svelte, Solid, Angular, React Native e Ink por um controlador compartilhado; o Chat precisa acrescentar comportamento de aplicação sem eleger um renderer canônico. Alternativas rejeitadas: núcleo React-first com wrappers (vaza JSX/hooks/DOM), Web Components como único renderer (sem experiência nativa em RN/Ink) e implementações totalmente independentes (comportamento e segurança divergem).

**Consequências.**

- Comportamento, sessões, ações e testes são compartilhados entre interfaces.
- Pacotes de renderer continuam nativos.
- Componentes visuais nem sempre são compatíveis em código-fonte entre plataformas.
- Uma suíte de conformidade e o contrato de fallback semântico tornam-se obrigatórios.

## Pacotes afetados

[[chat]] (definições neutras), [[chat-protocol]], todos os renderers ([[chat-react]], [[chat-vue]], [[chat-svelte]], [[chat-solid]], [[chat-angular]], [[chat-ink]], [[chat-react-native]]) e [[chat-example-shared]].

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0001-cross-framework-core.md`.
