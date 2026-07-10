# AgentsKit Chat v0 roadmap

The parent product requirement is [GitHub issue #1](https://github.com/AgentsKit-io/agentskit-chat/issues/1). Every child issue includes user stories, acceptance criteria, real dependency links, a test plan, documentation impact, delivery mode, and an explicit Definition of Done.

## Milestone

[v0 — Cross-framework foundation](https://github.com/AgentsKit-io/agentskit-chat/milestone/1)

## Delivery graph

```mermaid
flowchart TD
  I1["#1 PRD"] --> I31["#31 Upstream convergence gate"]
  I31 --> I2["#2 React vertical slice"]
  I2 --> I3["#3 React Native parity"]
  I2 --> I4["#4 Ink parity"]
  I2 --> I5["#5 Protocol + conformance"]
  I3 --> I5
  I4 --> I5

  I5 --> I6["#6 Deterministic routes + state"]
  I5 --> I7["#7 Schema-backed ChoiceList"]
  I5 --> I10["#10 Streaming lifecycle"]
  I7 --> I8["#8 Typed action + confirmation"]
  I8 --> I9["#9 Authorization + policy"]
  I10 --> I11["#11 Cross-client sessions"]
  I5 --> I12["#12 Web-standard server"]
  I11 --> I12
  I7 --> I13["#13 Theming + headless composition"]

  I5 --> I15["#15 Vue"]
  I5 --> I16["#16 Svelte"]
  I5 --> I17["#17 Solid"]
  I5 --> I18["#18 Angular"]
  I7 --> I19["#19 Component catalog"]
  I15 --> I19
  I16 --> I19
  I17 --> I19
  I18 --> I19

  I3 --> I14["#14 Initial init CLI"]
  I4 --> I14
  I12 --> I14
  I14 --> I20["#20 Cross-framework CLI"]
  I19 --> I20

  I5 --> I21["#21 Replay + diagnostics"]
  I11 --> I21
  I8 --> I22["#22 Support reference"]
  I12 --> I22
  I19 --> I22
  I6 --> I23["#23 Onboarding reference"]
  I19 --> I23
  I9 --> I24["#24 Operations reference"]
  I21 --> I24
  I12 --> I25["#25 RAG reference"]
  I19 --> I25

  I25 --> I26["#26 AgentsKit Docs dogfood"]
  I26 --> I27["#27 Registry + Playbook dogfood"]
  I6 --> I28["#28 AKOS extraction"]
  I9 --> I28
  I13 --> I28
  I21 --> I28

  I13 --> I29["#29 Accessibility + conformance gates"]
  I19 --> I29
  I20 --> I29

  I20 --> I30["#30 v0 release"]
  I22 --> I30
  I23 --> I30
  I24 --> I30
  I25 --> I30
  I26 --> I30
  I27 --> I30
  I28 --> I30
  I29 --> I30
```

The diagram highlights the critical path. Individual issue bodies are authoritative for the complete dependency set.

## Architecture proof

- [#31 Upstream convergence and ownership gate](https://github.com/AgentsKit-io/agentskit-chat/issues/31) — HITL, blocks implementation
- [#2 React hello-world vertical slice](https://github.com/AgentsKit-io/agentskit-chat/issues/2) — AFK
- [#3 React Native parity](https://github.com/AgentsKit-io/agentskit-chat/issues/3) — AFK
- [#4 Ink parity](https://github.com/AgentsKit-io/agentskit-chat/issues/4) — AFK
- [#5 Versioned protocol and conformance fixtures](https://github.com/AgentsKit-io/agentskit-chat/issues/5) — HITL

## Core interactive behavior

- [#6 Deterministic routes and conversational state](https://github.com/AgentsKit-io/agentskit-chat/issues/6)
- [#7 Schema-backed ChoiceList](https://github.com/AgentsKit-io/agentskit-chat/issues/7)
- [#8 Typed action with confirmation](https://github.com/AgentsKit-io/agentskit-chat/issues/8)
- [#9 Authorization and action policy](https://github.com/AgentsKit-io/agentskit-chat/issues/9)
- [#10 Streaming lifecycle parity](https://github.com/AgentsKit-io/agentskit-chat/issues/10)
- [#11 Persistent cross-client sessions](https://github.com/AgentsKit-io/agentskit-chat/issues/11)
- [#12 Web-standard server handler](https://github.com/AgentsKit-io/agentskit-chat/issues/12)
- [#13 Semantic theming and headless composition](https://github.com/AgentsKit-io/agentskit-chat/issues/13) — HITL

## Renderer and CLI expansion

- [#14 Initial `init` for React, React Native, and Ink](https://github.com/AgentsKit-io/agentskit-chat/issues/14)
- [#15 Vue renderer](https://github.com/AgentsKit-io/agentskit-chat/issues/15)
- [#16 Svelte renderer](https://github.com/AgentsKit-io/agentskit-chat/issues/16)
- [#17 Solid renderer](https://github.com/AgentsKit-io/agentskit-chat/issues/17)
- [#18 Angular renderer](https://github.com/AgentsKit-io/agentskit-chat/issues/18)
- [#19 Cross-framework component catalog](https://github.com/AgentsKit-io/agentskit-chat/issues/19)
- [#20 Cross-framework CLI and component generator](https://github.com/AgentsKit-io/agentskit-chat/issues/20)
- [#21 Replay and parity diagnostics](https://github.com/AgentsKit-io/agentskit-chat/issues/21)

## Reference applications

- [#22 Support application](https://github.com/AgentsKit-io/agentskit-chat/issues/22)
- [#23 Deterministic onboarding](https://github.com/AgentsKit-io/agentskit-chat/issues/23)
- [#24 Policy-protected operations](https://github.com/AgentsKit-io/agentskit-chat/issues/24)
- [#25 Cited RAG application](https://github.com/AgentsKit-io/agentskit-chat/issues/25)

## Dogfood and release

- [#26 AgentsKit Docs migration](https://github.com/AgentsKit-io/agentskit-chat/issues/26)
- [#27 Registry and Playbook migration](https://github.com/AgentsKit-io/agentskit-chat/issues/27)
- [#28 AKOS generic copilot extraction](https://github.com/AgentsKit-io/agentskit-chat/issues/28) — HITL
- [#29 Accessibility and platform-conformance gates](https://github.com/AgentsKit-io/agentskit-chat/issues/29)
- [#30 v0 documentation and release](https://github.com/AgentsKit-io/agentskit-chat/issues/30) — HITL

## Parallel work

After #5 is accepted, #6, #7, #10, #15, #16, #17, and #18 have independent ownership and may proceed concurrently. Renderer work shares protocol fixtures but must not alter the accepted protocol without a new ADR and coordinated compatibility review.
