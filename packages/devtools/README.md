# @agentskit/chat-devtools

Application trace capture, upstream replay-fixture composition, and semantic renderer parity diagnostics for AgentsKit Chat.

This package does not record or replay model calls. Use `createRecordingAdapter` and `createReplayAdapter` from `@agentskit/eval/replay`; store the resulting cassette beside application traces with `createReplayFixture`.
