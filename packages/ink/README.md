# @agentskit/chat-ink

Opinionated Ink shell for a framework-neutral AgentsKit Chat definition. Chat state, streaming, keyboard history, cancellation, and terminal primitives come directly from `@agentskit/ink`.

Unsupported visual components should be validated through `parseSemanticFallback` from `@agentskit/chat` and rendered through `SemanticFallback`, preserving the shared kind and human-readable summary in plain terminal text.

The native `ChoiceList` supports Up/Down or a number followed by Enter and emits the shared selection event.
