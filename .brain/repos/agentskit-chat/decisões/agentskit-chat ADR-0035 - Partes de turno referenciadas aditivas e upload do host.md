---
tipo: adr
repo: agentskit-chat
camada: ferramenta
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit-chat: d8aa3a5 }
metodo: "resumo do ADR versionado, com referências conferidas contra o código; auditado em 2026-10-16; nada foi executado"
fontes: ["docs/architecture/adrs/0035-referenced-turn-parts-and-upload-policy.md"]
tags: [adr, repo/agentskit-chat, camada/ferramenta]
---
# agentskit-chat ADR-0035 - Partes de turno referenciadas aditivas e upload do host

> [!tldr] Em linguagem comum
> O protocolo ganha, de forma aditiva, entradas de turno com texto e referências a arquivos e uma política de upload controlada pelo host, sem nunca trafegar binários no JSON do chat.

← [[00 Decisões - agentskit-chat]]

## Status e datas

Status na fonte: Proposed; escopo de implementação aprovado pelo coordenador em 2026-10-06. Data: 2026-10-06 (aprovação de escopo; sem campo de data no arquivo-fonte). Fonte: `docs/architecture/adrs/0035-referenced-turn-parts-and-upload-policy.md`.

## Decisão em linguagem comum

Estende o protocolo v1 de forma aditiva com entradas de texto/referência a arquivo e capacidades opcionais no snapshot. Clientes devem ecoar `turn-parts-v1`; o servidor só pode anunciá-la quando o controlador upstream suportado preservar as partes no dispatch; os snapshots atuais não anunciam capacidades; submissões de referência válidas falham explicitamente com 501; turnos em string mantêm o ciclo de vida upstream e o limite de 64 KiB. Uploads são política de aplicação: um endpoint de metadados autorizado pelo host assina PUTs diretos de storage por uma porta `BlobStore`; o JSON do chat nunca carrega binários. Referências são amarradas a identificadores confiáveis de tenant/sessão, checadas antes de leituras e verificadas contra MIME, tamanho e SHA-256 reais; SigV4 vem de `aws4fetch` (sem assinador próprio); PUT assina tamanho e MIME e as URLs expiram em até dez minutos. O GET assinado curto do `BlobStore` é a seam futura para o adapter.

## Contexto e consequências

**Contexto.** Em `@agentskit/core` existem `ContentPart` e `Message.parts`, mas `ChatController.send(text: string)` chama `text.trim()` e monta uma mensagem só de texto; nenhuma versão publicada aceitava partes (confirmado pelo coordenador). A API de envio neutra que falta pertence ao upstream (ADR-0002); habilitar a capacidade segue bloqueado até haver mudança upstream publicada e rastreada e um fluxo real de entrega ao adapter (feito na ADR-0038).

**Consequências.**

- Nenhuma mudança incompatível nos campos da v1.
- Hosts são donos de autenticação, autorização de sessão, CORS do bucket, credenciais de storage e ciclo de vida de uploads abandonados.
- Checksums fazem buffer de no máximo `maxBytes`; hash incremental de arquivos grandes fica adiado.
- SeaweedFS local real e workerd exercitam o fluxo; isso não é certificação de R2/S3 em produção.

## Pacotes afetados

[[chat-server]] (`packages/server/src/uploads.ts`: `createUploadHandler` `:51`, `resolveUploadParts` `:106`, `createS3BlobStore` `:179`; testes `uploads.test.ts`, fixture `tests/fixtures/upload-worker.ts`), [[chat-protocol]] (`packages/protocol/tests/parts.test.ts`). Relatório: `docs/ch-d-parts-upload-report.md`.

## Substitui / substituído por

Completada pela [[agentskit-chat ADR-0038 - Partes referenciadas entregues na fronteira do adapter]]: o 501 descrito acima passou a valer só para servidores sem política de upload (`packages/server/src/index.ts:128`).

## Fonte

`docs/architecture/adrs/0035-referenced-turn-parts-and-upload-policy.md`.
