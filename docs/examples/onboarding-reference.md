# Deterministic onboarding reference

This reference combines deterministic collection, injected recommendations, revision, and policy-protected completion without allowing model output or component payloads to mutate conversation state. Open React or React Native with `?reference=onboarding`; run Ink with `AK_EXAMPLE=onboarding`.

## State diagram

```text
welcome --/onboarding--> collecting --valid form + /recommend--> review
review --Revise answers + /revise--> collecting
review --Use this setup + /accept--> confirming
confirming --confirmed tool + /done--> complete
```

Unknown input stays agentic in the current state. Component interactions only record validated intent; the next command must satisfy the active state and guard. The recommender receives no session mutator.

## Component and accessibility map

| Step | Component | Native evidence |
|---|---|---|
| Collection/revision | `Form` | labelled HTML controls, React Native radio/text controls, Ink keyboard fields |
| Recommendation | `ChoiceList` | semantic buttons/pressables and arrow/number terminal selection |
| Completion | actionable `ChoiceList` | upstream AgentsKit confirmation on every renderer |

Frames use upstream message identity for deterministic per-turn IDs. Form values pass the closed catalog validator before accepting a supported role and non-empty goal. React uses native form semantics and focus styles; React Native exposes labelled radio/text controls; the Ink PTY suite completes without a pointer.

## Transcript

```text
❯ /onboarding
Tell us how you work
Primary role *: Engineering
First goal *: Automate handoffs

❯ /recommend
engineering starter
1. Use this setup — A guided workspace for Automate handoffs.
2. Revise answers

❯ /accept
Ready to create your workspace?
1. Complete onboarding

Allow complete-onboarding?
1. Yes  2. Yes, for session  3. No
Onboarding confirmed.

❯ /done
Onboarding complete. Your guided workspace is ready.
```

## Ownership and upstream adoption

`apps/example-shared` owns the coordinator, guarded routes, and recommendation domain. AgentsKit Chat owns sessions, Form/ChoiceList intents, policy composition, and per-turn identity. AgentsKit owns controller lifecycle, adapters, messages, tools, validation, confirmation, and official bindings.

Create exactly one application factory result per authenticated session and inject that session's trusted context. The returned definition, session, and intent handlers form one unit; do not share the definition across sessions. Durable hosts must persist domain answers alongside the AgentsKit Chat session snapshot.

Inspected AgentsKit revision `4d66eb192d636b53d0c7bec39894250dc71cde5f` and `@agentskit/core@1.12.2`. No state-machine primitive exists upstream; no source or behavior was copied, and no generic upstream gap blocks this reference.
