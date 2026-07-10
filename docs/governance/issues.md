# Issue governance

## Structure

Issues use tracer-bullet slices. A completed implementation issue must produce a narrow but complete outcome through the relevant contract, runtime, renderer, test, and documentation layers.

Each issue contains:

1. Parent PRD and user stories.
2. Outcome and non-goals.
3. Acceptance criteria.
4. Dependencies.
5. Test plan.
6. Documentation impact.
7. Definition of Done.
8. Delivery mode: AFK or HITL.
9. Upstream adoption: inspected AgentsKit source, reused exports, local responsibility, and linked upstream gaps.

## Definition of Done baseline

An issue is done only when:

- acceptance criteria are demonstrated by public behavior;
- runtime boundaries validate untrusted data;
- unit and integration tests pass;
- cross-framework fixtures pass for every affected renderer;
- accessibility and platform conventions are covered where UI changes;
- public behavior is documented;
- agent handoffs and ownership metadata remain accurate;
- `pnpm docs:bridge:gate` passes;
- no untracked TODO, disabled behavior, or undocumented breaking change remains.
- the issue records upstream reuse and introduces no duplicate AgentsKit primitive;
- any generic upstream gap is fixed and released from `AgentsKit-io/agentskit` before local integration.

Issue-specific requirements extend this baseline rather than replace it.

## Dependencies

Issues are created in dependency order. `Blocked by` must reference real issue numbers. Parallel slices must avoid overlapping ownership or explicitly state their shared contract fixture.
