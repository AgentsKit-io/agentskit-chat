---
title: Docs experience plan
description: Plan to make chat.agentskit.io a sellable, interactive product documentation site at agentskit.io quality.
---

# Docs experience plan

**Goal:** make [chat.agentskit.io](https://chat.agentskit.io) the place a developer
opens when they decide to ship an AI chat UI — with the same first-impression quality
as [www.agentskit.io](https://www.agentskit.io).

**North-star narrative:** *One AI chat. Every surface.*  
One `ChatDefinition` → native shells on web, mobile, and terminal.

## Quality bar (from agentskit.io)

| Pattern | AgentsKit source | Chat equivalent |
| --- | --- | --- |
| Interactive hero chat mock | `apps/docs-next/.../hero-demo` | `apps/docs/components/hero-demo` |
| Works-with logos | `WorksWithSection` / brand icons | `works-with-logos.tsx` |
| Architecture fanout | “One core. Everything plugs in.” | `architecture-fanout.tsx` |
| Tokenized code panels | `compose-showcase` | `highlighted-code.tsx` |
| Dark brand tokens | `brand-tokens.css` | `apps/docs/app/brand-tokens.css` |

## Phases

### P0 — Sell the first 10 seconds (in progress / this PR)

- [x] Dark-first brand system (`brand-tokens.css` + `@theme`)
- [x] Interactive hero demo (tool call, flights widget, mobile approval, terminal)
- [x] Works-with framework rail
- [x] Architecture fanout: `defineChat` → 7 renderers
- [x] Highlighted code panels (not raw unstyled `<pre>`)
- [x] Marketing homepage rewrite (`app/page.tsx`)
- [x] Dark default theme on the site shell
- [ ] Visual regression snapshots for hero / logos / fanout / code

### P1 — Make docs feel like a product, not a dump

- [ ] `/docs` as intentional IA hub (Start here / Renderers / Server / Reference)
- [ ] Premium framework tabs + install (pm + renderer + copy)
- [ ] Renderer capability matrix (not flat cards)
- [ ] Positioning table mounted on marketing + docs
- [ ] Search ranking weights for getting-started / renderers
- [ ] Docs chrome wayfinding (“recommended next”)

### P2 — Interactive depth

- [ ] Live playground pages (deterministic adapter, no API key)
- [ ] Embed real `AgentChat` demos on recipe pages
- [ ] Typed docs IA manifest (`lib/docs-ia.ts`) driving nav + homepage + search
- [ ] Budget + motion + dark snapshot gates in CI

## Non-goals

- Copying AgentsKit core marketing claims that Chat does not own
- Hosted multi-tenant SaaS pitch
- Replacing Fumadocs entirely (compose brand on top of it)

## Definition of done for “sellable”

1. A cold visitor understands the product in **under 8 seconds** from the hero.
2. They can **see** multi-surface (web/mobile/terminal) without reading a paragraph.
3. Code samples have **real syntax color** on dark surfaces.
4. The first CTA is scaffold/install, not an ADR list.
5. Docs IA starts with “Build”, not governance/ADR dump.

## Verification

```bash
pnpm --filter @agentskit/chat build
pnpm --filter @agentskit/chat-docs lint
pnpm --filter @agentskit/chat-docs test
pnpm --filter @agentskit/chat-docs build
pnpm --filter @agentskit/chat-docs test:e2e
```
