# Governing the Generative Drift: Boundary Contracts at the Change Horizon

**Authors:** Rob Larsen  
**Target Audience:** Principal Architects, VP/Directors of Engineering, Tooling Authors  
**Specification Reference:** [ACM Specification v1.1.0-draft](https://github.com/roblarsen/ACM/blob/main/spec.md)

---

## 1. Executive Summary & The Generative Horizon

Generative AI developer tooling (Copilot, Cursor, autonomous coding agents) has inverted the historical cost curve of software engineering. Day-1 syntax generation is virtually free. Developers scaffold entire features, complex microservices, and multi-file refactors in minutes. 

However, this explosion in Day-1 output has introduced an asymmetric **Day-2 Maintenance Crisis**:

```
+---------------------------------------------------------------------------------+
| THE GENERATIVE VELOCITY ASYMMETRY                                               |
|                                                                                 |
|  [Day 1: AI Generation]  =========================================> Output: 10x |
|  [Day 1: Test Execution] =========================================> Passes: 10x |
|                                                                                 |
|  [PR Boundary Review]    -----> Cognitive Bottleneck: 0.2x                     |
|  [Day 2: Production Run] -----> Silent Latent Failures & Outages: High Risk     |
+---------------------------------------------------------------------------------+
```

When human engineers write code by hand, architectural trade-offs are typically debated. When an LLM generates an implementation, it makes dozens of silent, implicit assumptions:
* It assumes in-memory caching will run on a single instance rather than a multi-replica autoscaling cluster.
* It assumes downstream payment APIs never exceed a 500ms timeout budget.
* It assumes database writes and event publishing succeed atomically without a transactional outbox.

Because AI code passes happy-path unit tests with ease, code review degrades into human reviewers reverse-engineering hidden failure modes line by line.

The **Assumptions & Constraints Manifest (ACM)** standard establishes a formal, machine-readable, and human-auditable contract format designed for this change horizon. It requires developers and autonomous agents to declare implicit runtime boundaries, distributed primitives, and unhandled failure modes as first-class artifacts in the Pull Request lifecycle.

---

## 2. The Architectural Taxonomy: Where ACM Fits

Software engineering already has mature formalisms for contracts, interfaces, and architectural intent. ACM does not replace these paradigms; it addresses the operational gap that occurs at the **point of change (Pull Request)**.

```text
+--------------------------------------------------------------------------------+
|                        SOFTWARE GOVERNANCE LANDSCAPE                           |
|                                                                                |
|  STRATEGIC INTENT                                                              |
|  └── Architecture Decision Records (ADRs)    [Macro: Long-term design choices] |
|                                                                                |
|  INTERFACE SPECIFICATION                                                       |
|  └── OpenAPI / AsyncAPI / Protobuf / JSONSchema  [Structural I/O contracts]    |
|                                                                                |
|  CHANGE BOUNDARY CONTRACTS                                                     |
|  └── Assumptions & Constraints Manifest (ACM) [Micro: PR runtime assumptions]  |
|                                                                                |
|  IMPLEMENTATION INVARIANTS                                                     |
|  └── Design by Contract (Meyer / Eiffel)      [Code Unit: Pre/Post conditions] |
+--------------------------------------------------------------------------------+
```

| Formalism | Scope & Granularity | Primary Lifecycle Phase | Enforcing Mechanism | Core Question Answered |
| :--- | :--- | :--- | :--- | :--- |
| **Architecture Decision Record (ADR)** | Macro / System-wide | Design & Inception | Human Architecture Review | *"Why did we choose Kafka over RabbitMQ two years ago?"* |
| **OpenAPI / JSON Schema / Protobuf** | System Boundary (I/O) | API Design & Integration | Schema Linters, Compilers, Type Checkers | *"What shape and data types does this JSON endpoint accept?"* |
| **Design by Contract (DbC)** | Code Unit (Class / Function) | Runtime Execution | Assertions, Unit Test Frameworks, Eiffel Runtime | *"What invariants must hold before and after this method runs?"* |
| **Assumptions & Constraints Manifest (ACM)** | **Change Horizon (PR Diff)** | **Code Review & CI Gate** | **`acm-cli`, Semantic CI, Reviewer Sign-off** | *"What silent operational boundaries is this implementation assuming right now?"* |

---

## 3. Deep-Dive Comparative Analysis

### 3.1 ACM vs. Architecture Decision Records (ADRs)

* **The Scope Mismatch:** ADRs document macro-architectural strategy (e.g., "Adopt Event-Driven Architecture with CQRS"). They are heavy, deliberate documents meant to endure for years.
* **The Pull Request Reality:** A developer submitting a 60-line PR for an Express checkout handler will not write an ADR. However, that 60-line PR might introduce an unhandled race condition by relying on process-local memory.
* **How They Complement:** ADRs set macro organizational strategy; ACM documents micro-change runtime reality. If multiple ACMs consistently mark `concurrency_safety: unsupported` on the same service, this telemetry provides evidence to justify a formal ADR to overhaul the system's concurrency model.

### 3.2 ACM vs. OpenAPI / Protobuf / Schemas

* **The Surface-Level Trap:** OpenAPI defines the *syntactic shape* of inputs and outputs (`status: 200`, `user_id: string (uuid)`). It is blind to operational execution semantics.
* **The Operational Gap:** OpenAPI cannot tell a reviewer that retrying a `POST /checkout` with the exact same payload will double-bill a customer because idempotency is unsupported. OpenAPI does not warn you that an endpoint will drop incoming requests if Redis crashes.
* **How They Complement:** OpenAPI validates interface schemas over the wire; ACM validates the operational boundaries and failure postures behind the handler.

### 3.3 ACM vs. Design by Contract (Bertrand Meyer)

* **The In-Code Limitation:** Classic Design by Contract (DbC) embeds preconditions, postconditions, and class invariants directly into runtime execution (e.g., `require`, `ensure`, `invariant` in Eiffel or assertions in Ada).
* **The Distributed Systems Reality:** Distributed failures often exist outside the boundaries of a single process or method. An in-code assertion cannot easily enforce that a multi-region deployment does not suffer from clock skew or that Kafka partitions are hashed correctly across consumer groups.
* **How They Complement:** ACM is **Design by Contract elevated to the Distributed PR Boundary**. It abstracts Meyer's foundational philosophy into machine-readable metadata and operational evidence during code review.

---

## 4. The Anatomy of an ACM Contract

An ACM document bridges machine-readable governance (YAML frontmatter) with auditable technical evidence (Markdown sections):

```markdown
<!-- ACM-START -->
---
acm_version: "1.1"
change_type: "feature"
risk_level: "critical"
contracts:
  idempotency:
    status: "unsupported"
    failure_mode: "Retrying POST re-authorizes credit cards and duplicates inventory holds."
  concurrency_safety:
    status: "unsupported"
    failure_mode: "checkStock() and holdStock() interleave under concurrent requests, causing SKU over-allocation."
  horizontal_scalability:
    status: "guaranteed"
    evidence: "Handler is fully stateless; relies entirely on external DB and remote APIs."
  strict_ordering:
    status: "not_applicable"
  data_loss_safety:
    status: "unsupported"
    failure_mode: "Postgres commit occurs before Kafka publish without an Outbox pattern."
distributed_primitives:
  consistency_model: "eventual"
  delivery_semantics: "at_least_once"
  degradation_mode: "fail_closed"
  backpressure_strategy: "fail_fast"
---

### 1. Invariants & Data Model Boundaries
* **Payload Validation:** Assumes items array is non-empty; no sanitization middleware is attached.

### 2. State & Runtime Topology
* **Concurrency & Locking:** No distributed Redlock or row locks exist across the inventory check loop.

### 3. Environmental & Network Assumptions
* **Dual-Write Vulnerability:** If payment succeeds but database creation fails, customer is billed with no order committed.

### 4. Explicit Non-Goals & Unhandled Failure Modes
* **Compensating Rollbacks:** No two-phase commit or Saga orchestrator implemented for partial checkout failures.
<!-- ACM-END -->
```

---

## 5. The ACM Governance Engine: CI/CD & Review Integration

To avoid degenerating into a passive checklist, the ACM standard operates as an automated governance gate:

```text
[ Developer / AI Agent ]
           │
           ▼
[ Pull Request Diff + ACM Block ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ CI GATE 1: Syntax & Singular Grammar Validation        │
│ • Validates frontmatter against acm.schema.json        │
│ • Rejects multiple, nested, or missing ACM blocks      │
└──────────────────────────┬─────────────────────────────┘
                           │ Passed
                           ▼
┌────────────────────────────────────────────────────────┐
│ CI GATE 2: Semantic Coherence & Risk Floor Validation  │
│ • Enforces 'evidence' when status is 'guaranteed'      │
│ • Enforces 'failure_mode' when status is 'unsupported' │
│ • Fails if risk_level is 'low' but contracts fail      │
└──────────────────────────┬─────────────────────────────┘
                           │ Passed
                           ▼
┌────────────────────────────────────────────────────────┐
│ REVIEW GATE: Boundary Audit & Signed Acknowledgment   │
│ • Reviewer reads explicit failure boundaries FIRST     │
│ • Explicit sign-off required for 'unsupported' flags   │
└──────────────────────────┬─────────────────────────────┘
                           │ Approved
                           ▼
                 [ Production Merge ]
```

---

## 6. Strategic Organizational Impact

Implementing the ACM standard transforms engineering organizations across three dimensions:

### 1. Radically Accelerated Pull Request Velocity
Reviewers no longer spend 45 minutes reverse-engineering implicit assumptions from a 400-line AI diff. By scanning the manifest first, a reviewer can identify structural blockers in 30 seconds:
> *"This PR implements local in-memory caching, but our service runs across 8 Kubernetes pods. Rejected before inspecting business logic."*

### 2. Forensic Post-Mortem Anchoring
When a production outage occurs, the incident response team consults the ACM committed with that feature. If the outage was caused by a known non-goal (e.g., `degradation_mode: fail_closed`), the team can diagnose the issue immediately. If the outage violated an asserted contract (`concurrency_safety: guaranteed`), it identifies an immediate regression in test coverage.

### 3. Drift Telemetry & Architecture Roadmapping
Aggregating ACM metadata across hundreds of PRs provides engineering leadership with concrete telemetry:
* Which microservices have the highest ratio of `concurrency_safety: unsupported`?
* Where is technical debt accumulating fastest across autonomous development teams?

---

## 7. Conclusion: The Path Forward

Generative AI has solved the code generation problem. The defining challenge of modern software engineering is now **boundary governance**. 

By establishing explicit, typed operational contracts at the pull request boundary, the **Assumptions & Constraints Manifest (ACM)** standard turns generative velocity from a source of hidden architectural debt into a reliable, governed engineering workflow.

---

### Reference Links & Open Standards Ecosystem
* **Specification RFC:** [SPEC.md](https://github.com/roblarsen/ACM/blob/main/spec.md)
* **Metadata Schema:** [schemas/acm.schema.json](https://github.com/roblarsen/ACM/blob/main/schemas/acm.schema.json)
* **CLI Validator:** [acm-cli](https://github.com/roblarsen/ACM/tree/main/tooling/acm-cli)
* **Community Working Group:** [github.com/roblarsen/ACM](https://github.com/roblarsen/ACM)