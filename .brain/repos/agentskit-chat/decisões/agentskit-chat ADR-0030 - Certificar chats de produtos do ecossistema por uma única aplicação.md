---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0030-ecosystem-product-chat-convergence.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0030 - Certificar chats de produtos do ecossistema por uma única aplicação

> [!tldr] Em linguagem comum
> Só se pode dizer que um chat de produto do ecossistema usa o AgentsKit Chat com base em evidência registrada num livro-razão público (`ecosystem-adoption.json`), nunca pelo estado de uma issue.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted — HITL approved 2026-07-14. Data: 2026-07-14. Fonte: `docs/architecture/adrs/0030-ecosystem-product-chat-convergence.md`.

## Decisão em linguagem comum

O AgentsKit continua sendo o substrato de runtime (controladores, ciclo de vida, bindings, adapters, tools, memória, RAG, replay, eval); o AgentsKit Chat é a única camada de aplicação dos chats de produto (definições portáveis, rotas determinísticas, composição de políticas, manifestos de componentes, envelopes de sessão, protocolo, seams de servidor e shells nativos); hosts são donos de configuração, conteúdo, marca, deploy e ações/estados específicos do negócio. Um chat de produto deve consumir `@agentskit/chat` (ou subpath suportado) na versão exata certificada; uso direto de binding só é permitido em "exemplos de binding de baixo nível" explicitamente classificados, fora dos totais. O livro-razão `ecosystem-adoption.json` é validado por schema estrito (consumidores declarados, classificação, versão exata e import paths, pacotes legados restantes, evidência pública de CI e produção, atestados privados agregados sem URLs). `certified` deriva de evidência: versão exata, nenhum pacote legado, consumo consolidado, CI passando com URL HTTPS e smoke de produção passando; chats privados exigem também atestado de auditoria privada limitado. O livro-razão é uma linha de base auditada, não um monitor de rede: a CI valida schema e consistência sem depender de rede.

## Contexto e consequências

**Contexto.** O 0.3.0 consolida o framework em `@agentskit/chat` e `@agentskit/chat-cli`; Docs, Registry e Playbook consomem esse grafo, mas outros consumidores ainda usam nomes legados, não têm deploy de produção ou mantêm superfícies próprias; exemplos de binding de baixo nível parecem aplicações de chat. Fechamento de issue não sustenta uma alegação de adoção em todo o ecossistema. Rejeitados: inferir adoção de issues fechadas, exigir o framework em todo exemplo didático, rodar checagens de rede em todo teste e aceitar ranges de semver.

**Consequências.**

- "Powered by AgentsKit Chat" passa a ser mensurável e revisável.
- Exemplos de baixo nível seguem válidos sem enfraquecer a alegação de adoção.
- Consumidores privados provam conformidade sem expor lógica interna.
- Adicionar/remover consumidor declarado exige revisão de schema e ADR; promoção ampla fica bloqueada até todos os chats de produto exigidos estarem certificados.

## Pacotes afetados

Repositório: `ecosystem-adoption.json`, `scripts/check-ecosystem-adoption.mjs`, `scripts/ecosystem-adoption-lib.mjs`, `scripts/ecosystem-adoption.test.mjs` (`pnpm ecosystem:adoption:check`, `pnpm test:ecosystem-adoption` — `package.json:41,46`; `ci.yml:67`); documentação `docs/dogfood/ecosystem-adoption.md`. Hosts-exemplo: [[chat-docs]].

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0030-ecosystem-product-chat-convergence.md`.
