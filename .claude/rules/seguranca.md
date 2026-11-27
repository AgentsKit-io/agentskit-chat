# Security rules

Each rule says how it is verified.

- **No secret in the repository.** Code, docs, fixtures and examples use obvious synthetic values. Verified by: gitleaks (`.gitleaks.toml`, `.github/workflows/gitleaks.yml`).
- **A secret never goes in a log, PR, issue or commit.** Reference it by name, never by value. Verified by: review.
- **No high or critical vulnerability in production dependencies.** Verified by: `pnpm audit --prod --audit-level high`.
- **A private repository never leaks into a public one.** Check `gh api repos/<org>/<repo> --jq .visibility` before copying anything (see AGENTS.md). Verified by: review.
- **Third-party actions pinned by commit SHA**, with the version in a comment. Verified by: review of the workflows.
