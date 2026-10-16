---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0027-fumadocs-framework-dogfood.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0027 - Site Fumadocs como host de dogfood de primeira classe

> [!tldr] Em linguagem comum
> O site de documentação é um app Next.js com Fumadocs que lê a pasta `docs/` e usa o próprio Chat como assistente: respostas exatas locais primeiro, depois o serviço Ask.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted — HITL approved 2026-07-16. Data: 2026-07-14. Fonte: `docs/architecture/adrs/0027-fumadocs-framework-dogfood.md`.

## Decisão em linguagem comum

Cria `apps/docs`, um único app Next.js App Router com Fumadocs (monólito modular, a única nova unidade de deploy). A árvore `docs/` do repositório continua sendo o corpus humano canônico; o Fumadocs a lê direto, com metadados de navegação versionados, e rotas de Markdown cru e `llms.txt` expõem as mesmas fontes. O assistente interativo é um host React comum do framework público: `@agentskit/chat/protocol` valida o artefato local de conhecimento; `@agentskit/chat` compõe resolução determinística, adapter Ask e memória de sessão do navegador; `@agentskit/chat/react` renderiza sobre `@agentskit/react`; perguntas exatas conhecidas resolvem do artefato verificado antes de qualquer rede e os misses usam o contrato Ask versionado (endpoint same-origin por padrão). A rota Next self-hosted usa `createAskServiceHandler` de `@agentskit/chat/server`; sem os adapters de produção, a rota devolve resposta explícita de indisponível — nunca inventa resposta ou citação. A busca do Fumadocs é só navegação da documentação, não retrieval do Ask. Aceite: o dono aprovou o texto de maturidade "Alpha" e a postura de deploy em 2026-07-16.

## Contexto e consequências

**Contexto.** O repositório já tinha documentação Markdown canônica, corpus do Doc Bridge, artefatos determinísticos, contrato de backend Ask e renderer React; uma propriedade pública de documentação deve compor tudo isso sem segundo corpus, controlador, motor de retrieval, protocolo ou memória de navegador. Rejeitados: copiar Markdown para `apps/docs/content/docs`, widget de chat específico do host, Fumadocs search como retrieval semântico, exigir backend hospedado e repositório de docs separado.

**Consequências.**

- Documentação e site compartilham uma única fonte de verdade.
- O site é implantável de forma independente, dentro da governança de release e CI.
- Perguntas conhecidas ficam rápidas e disponíveis sem credenciais de provider; respostas de raciocínio exigem backend configurado e citações seguras.
- O monorepo ganha custo de build de Next/Fumadocs; escolhas de provider e vector store são preocupações de deploy.

## Pacotes afetados

[[chat-docs]] (`apps/docs`; `apps/docs/source.config.ts:9` lê `../../docs`, `apps/docs/app/api/ask/route.ts:7` responde indisponível), usando [[chat]], [[chat-protocol]] e [[chat-react]] via subpaths.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0027-fumadocs-framework-dogfood.md`.
