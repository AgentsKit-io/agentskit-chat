# Ink support reference

Runs the unchanged `supportChat` definition in a terminal with keyboard choice and confirmation flows.

See the [support reference guide](../../docs/examples/support-reference.md).

Run `pnpm --filter @agentskit/chat-example-ink build` and `pnpm --filter @agentskit/chat-example-ink start` to launch the deterministic shared chat in a terminal.

- Enter sends a prompt.
- Escape stops an active streamed response.
- Up/down recalls prompt history.
- Ctrl+C exits the process.

Set `AK_EXAMPLE=onboarding` for the [deterministic onboarding reference](../../docs/examples/onboarding-reference.md).

Set `AK_EXAMPLE=operations` for the [policy-protected operations reference](../../docs/examples/operations-reference.md).

Set `AK_EXAMPLE=rag` for the [cited RAG reference](../../docs/examples/rag-reference.md).
