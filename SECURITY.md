# Security policy

## Supported versions

Security fixes are provided for the latest `0.x` minor release. During v0,
upgrade to the latest minor before reporting an issue that is already fixed.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's
**Security → Report a vulnerability** flow for
`AgentsKit-io/agentskit-chat`. Include the affected package and version, impact,
minimal reproduction, and any proposed mitigation. Do not include production
credentials, private prompts, customer data, or private host implementation.

## Application boundary

AgentsKit Chat validates its application protocols, component frames, action
inputs, session metadata, and release artifacts. Hosts still own authentication,
authorization context, tenant isolation, rate limits, secrets, provider keys,
storage policy, audit retention, and deployment hardening.

- Keep model/provider credentials on a trusted server. Never embed them in a
  browser or mobile bundle.
- Treat model output, persisted sessions, network events, component props, and
  action inputs as untrusted.
- Register only known actions and components. Unknown output must remain inert.
- Keep authorization and confirmation outside prompts and model output.
- Put deadlines and cancellation on every network and storage boundary.
- Render links only after scheme and destination validation.
- Redact secrets and personal data before recording application traces.

See [action policy](./docs/actions/policy.md),
[confirmation](./docs/actions/confirmation.md), and
[deployment modes](./docs/deployment.mdx).
