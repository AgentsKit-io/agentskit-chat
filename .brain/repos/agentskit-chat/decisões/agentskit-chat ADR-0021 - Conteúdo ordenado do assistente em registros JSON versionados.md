---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0021-ordered-assistant-content-records.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0021 - Conteúdo ordenado do assistente em registros JSON versionados

> [!tldr] Em linguagem comum
> Uma única resposta do assistente pode misturar texto e componentes em ordem (por exemplo prosa e depois uma lista de fontes), codificada como linhas JSON versionadas dentro do texto da própria mensagem.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Accepted. Data: 2026-07-13. Fonte: `docs/architecture/adrs/0021-ordered-assistant-content-records.md`.

## Decisão em linguagem comum

`@agentskit/chat-protocol` define `agentskit.chat.content/1`: um fluxo ordenado de registros guardado dentro de uma única string canônica de mensagem do assistente. Começa com um prefixo reservado (separador de registro); cada linha JSON seguinte é texto limitado — codificado pelo host com `createAssistantContentEncoder` — ou um `ComponentRenderFrame` já validado. O encoder escapa o texto em JSON, mantendo inertes quebras de linha, JSON e valores parecidos com o protocolo vindos do modelo; o decoder só expõe registros completos enquanto o último ainda chega, e impõe limites de bytes UTF-8, número de registros, texto, props, fallback e frame. Registros malformados e versões não suportadas geram diagnósticos fixos e seguros; renderers resolvem cada componente pelo manifesto fechado. Strings simples e frames de mensagem inteira mantêm o comportamento anterior.

## Contexto e consequências

**Contexto.** O AgentsKit guarda e transmite o conteúdo canônico como string; o envelope de componente só renderiza quando a string inteira é um frame. Combinar prosa e componente exigiria uma segunda linha do tempo no host. Rejeitados: um único documento JSON (incompleto durante o streaming), delimitadores textuais crus (injeção pelo modelo), linha do tempo paralela no host e mudar `Message.content` no AgentsKit.

**Consequências.**

- Prosa fundamentada pode aparecer em streaming antes de um `source-list` validado no mesmo turno.
- Hosts devem codificar cada pedaço de texto; concatenar texto cru do modelo ao envelope é uso inválido.
- O prefixo reservado deixa de ser renderizado como texto comum.
- Os demais shells nativos precisam adotar o protocolo antes de se declarar paridade estável (#30).

## Pacotes afetados

[[chat-protocol]], [[chat]] (integração Ask e apresentação — `packages/chat/src/presentation.ts`, `ask.ts`), todos os renderers.

## Substitui / substituído por

Não declarado na fonte.

## Fonte

`docs/architecture/adrs/0021-ordered-assistant-content-records.md`.
