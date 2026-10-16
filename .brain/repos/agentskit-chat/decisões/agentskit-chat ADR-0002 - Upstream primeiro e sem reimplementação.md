---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0002-upstream-first-no-reimplementation.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0002 - Upstream primeiro e sem reimplementação

> [!tldr] Em linguagem comum
> Antes de criar qualquer peça nova, o Chat procura no AgentsKit; se faltar algo genérico, conserta-se lá primeiro e o Chat só consome a versão publicada.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-10. Fonte: `docs/architecture/adrs/0002-upstream-first-no-reimplementation.md`.

## Decisão em linguagem comum

Regra upstream-first: (1) pesquisar a fonte e a API pública do AgentsKit; (2) reutilizar diretamente um contrato existente; (3) compor/adaptar só quando falta política ou DX de aplicação; (4) se falta ou há defeito num primitivo neutro, alterar `AgentsKit-io/agentskit` primeiro, com issue, ADR, testes e release; (5) consumir a API publicada, sem copiar fonte, fork, arquivos privados ou caminhos de workspace não publicados. A ADR traz uma matriz de propriedade (adapters, ciclo de vida do `ChatController`, ferramentas, confirmação, memória, RAG, replay/eval ficam no AgentsKit; rotas determinísticas, registro de componentes, protocolo cliente-servidor, CLI e statecharts de aplicação ficam no Chat).

## Contexto e consequências

**Contexto.** Sem uma regra explícita, o Chat poderia criar implementações paralelas com tipos e comportamentos ligeiramente diferentes, dividir correções entre repositórios e tornar falsa a alegação de dogfood. Toda issue de implementação e todo review precisam de um registro de adoção upstream (fonte inspecionada, exports reutilizados, comportamento local, trabalho upstream ligado).

**Consequências.**

- O AgentsKit permanece a fonte única de verdade dos primitivos reutilizáveis.
- O Chat consome APIs publicadas, sem caminho interno privilegiado.
- Algumas issues podem bloquear até um release upstream.
- O framework fica menor e focado em composição, política, protocolo e DX.

## Pacotes afetados

Todos. O registro vivo de adoção está em `docs/architecture/upstream-adoption.md`; a regra aparece como invariante nas notas de [[chat]], [[chat-protocol]], [[chat-server]] e [[chat-devtools]] e em `AGENTS.md:11`.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0002-upstream-first-no-reimplementation.md`.
