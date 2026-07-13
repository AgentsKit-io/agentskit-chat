# Changesets

Every public behavior or contract change must include a Changeset. All public
AgentsKit Chat packages are a fixed version group: the first stable release is
`0.1.0`, and a change to any package advances the group together.

Run `pnpm changeset` while developing. Release preparation runs
`pnpm version:packages`, reviews the generated versions and changelogs, and
then runs the complete release gate. The v0 release candidate is already
versioned from a mixed alpha/unreleased graph, so its one-time empty bootstrap
Changeset records the release PR without requesting an incorrect second bump.
