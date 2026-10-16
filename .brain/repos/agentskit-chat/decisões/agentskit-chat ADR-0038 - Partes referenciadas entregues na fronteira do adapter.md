---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0038-reference-parts-adapter-delivery.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0038 - Partes referenciadas entregues na fronteira do adapter

> [!tldr] Em linguagem comum
> Os arquivos enviados chegam ao modelo trocando a referência opaca por uma URL assinada nova (ou pelos bytes) no momento de cada chamada ao modelo, nunca guardando URL nem bytes na conversa.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Proposed; completa a entrega deixada em aberto pela ADR-0035. Data: sem data no arquivo-fonte. Fonte: `docs/architecture/adrs/0038-reference-parts-adapter-delivery.md`.

## Decisão em linguagem comum

O handler verifica as referências da submissão como antes e então chama `controller.send` upstream com partes de core cujo `source` é a referência opaca (`tenantId/sessionId/uuid`); MIME de imagem vira parte `image`, o resto vira `file`. Transcrição, registro de memória e snapshots carregam só a referência — nenhuma URL assinada nem bytes são guardados ou enviados ao cliente. Quando há política de upload, o handler embrulha o adapter da definição com `deliverUploadParts`; a cada chamada ao modelo o wrapper reescreve, no request que encaminha, cada parte cuja fonte é uma referência do escopo tenant/sessão autorizado: `delivery: "url"` (padrão) usa um GET assinado por `BlobStore.presignGet` por `expiresIn` (300 s padrão, 600 s no máximo); `delivery: "bytes"` usa os bytes como URL `data:`, lidos com o limite `maxBytes` por arquivo e `maxTotalBytes` opcional por chamada. Fontes fora do escopo passam intactas. Um servidor com política de upload anuncia `turn-parts-v1`; sem ela continua respondendo 501 `TURN_PARTS_UNAVAILABLE`; adapter com `capabilities.multiModal === false` é recusado com 422 `TURN_PARTS_UNSUPPORTED` antes do modelo quando há partes de arquivo; o handler nunca achata partes em texto.

## Contexto e consequências

**Contexto.** A ADR-0035 parou em 501 porque o `ChatController.send` publicado só aceitava string; o Core 1.15 pendente aceita `send(string | ContentPart[])` e os adapters serializam partes de imagem/arquivo por provider. Faltava resolver a expiração de URL assinada enquanto a transcrição é guardada e reexecutada, e a sobrescrita de um objeto já validado. Trabalho upstream ligado: agentskit#1826 (partes em adapters) e #1828 (`send` com partes), ainda sem release quando a ADR foi escrita.

**Consequências.**

- O callback `uploads.tenantId` agora roda em todo turno de um servidor com uploads (turnos de texto e decisões inclusive).
- O objeto é verificado (tamanho, MIME, SHA-256) na submissão, não de novo nas entregas; quem precisa dessa garantia ao longo do tempo deve tornar os objetos imutáveis (bucket versionado ou chaves write-once).
- `delivery: "bytes"` relê cada objeto referenciado a cada chamada ao modelo; um objeto que some antes da entrega falha o turno (`CHAT_TURN_FAILED`) sem chamar o modelo com requisição parcial.
- R2, MinIO e chamada real a provider não são certificados por esta mudança.

## Pacotes afetados

[[chat-server]] (`deliverUploadParts` `packages/server/src/uploads.ts:136`; 422 em `packages/server/src/index.ts:139`, 501 em `:128`; teste `packages/server/tests/uploads.test.ts`), [[chat-protocol]] (partes de turno).

## Substitui / substituído por

Completa a [[agentskit-chat ADR-0035 - Partes de turno referenciadas aditivas e upload do host]].

## Fonte

`docs/architecture/adrs/0038-reference-parts-adapter-delivery.md`.
