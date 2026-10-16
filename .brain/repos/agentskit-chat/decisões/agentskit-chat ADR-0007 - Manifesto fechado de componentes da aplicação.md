---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0007-closed-application-component-manifest.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0007 - Manifesto fechado de componentes da aplicação

> [!tldr] Em linguagem comum
> Só componentes registrados, com props validadas, podem aparecer na tela; qualquer outra coisa que o modelo invente é ignorada com um erro seguro.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-11. Fonte: `docs/architecture/adrs/0007-closed-application-component-manifest.md`.

## Decisão em linguagem comum

`@agentskit/chat` é dono de um manifesto fechado de componentes: cada entrada tem chave estável e schema Zod de props. Um frame de render só é utilizável se o envelope v1 for válido, a chave estiver registrada e as props passarem no schema; caso contrário a resolução é inerte e devolve diagnóstico tipado e não repetível. `@agentskit/chat-protocol` é dono do frame de render neutro, do evento de seleção semântica, do decoder seguro, das fixtures e do schema de fio do fallback (ADR-0003). Renderers são donos só de apresentação e mecânica de interação e emitem o mesmo evento validado. `ChoiceList` é o primeiro componente registrado (prompt + 1–20 escolhas com id único).

## Contexto e consequências

**Contexto.** O AgentsKit é dono da união `UIElement` padrão; aplicações precisam de componentes semânticos personalizados cujas props produzidas pelo modelo não são confiáveis. Estender ou copiar a união upstream criaria um protocolo de UI generativa concorrente; aceitar nomes ou props arbitrários transformaria saída de modelo em configuração executável.

**Consequências.**

- O AgentsKit segue como único dono da UI generativa padrão.
- Chaves desconhecidas e frames/props inválidos não chamam callbacks da aplicação.
- Renderers compartilham identidade, props, fallback e eventos sem compartilhar primitivos de UI.
- Adicionar componente é mudança explícita de registro e documentação; mudar semântica obrigatória exige nova versão de protocolo e ADR.

## Pacotes afetados

[[chat]] (manifesto, `resolveComponentFrame`), [[chat-protocol]] (frame, evento de seleção, fixtures) e todos os renderers.

## Substitui / substituído por

Reatribui parte da [[agentskit-chat ADR-0003 - Envelope semântico de fallback neutro de framework]]; ampliada pela [[agentskit-chat ADR-0015 - Catálogo fechado de componentes padrão da aplicação]].

## Fonte

`docs/architecture/adrs/0007-closed-application-component-manifest.md`.
