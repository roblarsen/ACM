# Assumptions & Constraints Manifest (ACM)

> **A formal open-source engineering standard for boundary verification, typed operational contracts, and AI-governed software delivery.**

[![Specification](https://img.shields.io/badge/spec-v1.1.0--draft-blue.svg)](./spec.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

---

## The Problem: The "Happy Path Trap" & Generative Debt

AI developer tooling (Copilot, Cursor, autonomous coding agents) has inverted the cost curve of writing code. Day-1 syntax generation is virtually free, but it introduces an asymmetric **Day-2 Maintenance Crisis**:

* **Silent Architectural Drift:** LLMs make hundreds of unstated runtime assumptions—process-local in-memory state on multi-pod clusters, non-atomic database writes, missing timeout budgets, and unhandled race conditions.
* **The PR Review Bottleneck:** Reviewers waste significant cognitive effort reverse-engineering what the model or author *assumed*, rather than reviewing business intent.
* **Superficial Green Tests:** Happy-path unit tests pass with ease against silent assumptions, only to fail catastrophically under production concurrency, network partitions, or container restarts.

The **Assumptions & Constraints Manifest (ACM)** standard elevates classic **Design by Contract (Bertrand Meyer)** and **Architecture Decision Records (ADRs)** to the Pull Request boundary.

---

## What's New in v1.1: Typed Semantic Contracts

ACM v1.0 enforced syntax; **ACM v1.1 enforces trustworthy semantics**:

1. **Typed Contract Model:** Replaces coarse flat booleans with discrete operational statuses:
   `guaranteed` | `conditional` | `unsupported` | `not_applicable` | `unknown`.
2. **Evidence Anchoring & Proof Obligations:** Assertions of `guaranteed` MUST cite concrete code mechanisms or tests; `unsupported` assertions MUST declare an explicit `failure_mode`.
3. **First-Class Distributed Primitives:** Directly captures consistency models, transport delivery guarantees, degradation postures (fail-open vs. fail-closed), and backpressure strategies.
4. **Risk-Floor Enforcement:** CI linters mathematically forbid `risk_level: low` when critical contracts (data loss, concurrency) are unsupported or unanalyzed.

```text
[ Developer / AI Agent ]
           │
           ▼
[ Source Code + ACM Block ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ CI Gate: acm-cli v1.1 Validation                       │
│ • Validates frontmatter against acm.schema.json        │
│ • Enforces singular delimiter grammar                  │
│ • Checks evidence obligations & semantic risk floors   │
└──────────────────────────┬─────────────────────────────┘
                           │ Passed
                           ▼
┌────────────────────────────────────────────────────────┐
│ Reviewer Gate: Boundary Audit First                    │
│ • Audit explicit failure boundaries & non-goals        │
│ • Fast rejection of architectural mismatches           │
└────────────────────────────────────────────────────────┘
```

---

## Quick Look: Manifest Format (v1.1)

An ACM consists of a machine-readable YAML frontmatter header followed by four auditable markdown taxonomy sections:

```markdown
<!-- ACM-START -->
---
acm_version: "1.1"
change_type: "feature"
risk_level: "critical"
contracts:
  idempotency:
    status: "unsupported"
    failure_mode: "Retrying POST re-authorizes payment and duplicates inventory holds."
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
tags:
  - "checkout"
  - "stripe"
  - "distributed-saga"
---

### 1. Invariants & Data Model Boundaries
* **Payload Validation:** Assumes items array is non-empty; no sanitization middleware is attached.
* **Temporal Semantics:** Assumes timestamps are ISO 8601 UTC; relies on system NTP clock without skew compensation.

### 2. State & Runtime Topology
* **Concurrency & Locking:** No distributed Redlock or row locks exist across the inventory check loop.
* **Clustering & Replicas:** Stateless Node.js handler safe to scale horizontally, but exposes external inventory services to concurrent race conditions across replicas.

### 3. Environmental & Network Assumptions
* **Dual-Write Vulnerability:** If payment succeeds but database creation fails, customer is billed with no order committed.

### 4. Explicit Non-Goals & Unhandled Failure Modes
* **Compensating Rollbacks:** No two-phase commit or Saga orchestrator implemented for partial checkout failures.
* **Degradation:** Network drops during Stripe communication trigger unhandled promise rejections resulting in HTTP 500 without releasing inventory holds.
<!-- ACM-END -->
```

---

## Repository Structure

```text
├── spec.md                    # Formal v1.1.0 RFC specification
├── schemas/
│   ├── acm.schema.json        # JSON Schema Draft 2020-12 definition
│   └── acm.schema.yaml        # OpenAPI / YAML Schema definition
├── templates/
│   ├── PULL_REQUEST_TEMPLATE.md # Drop-in PR template with signed sign-off checklist
│   └── CURSORRULES.md         # Drop-in rules for Cursor & Copilot agents
├── tooling/
│   └── acm-cli/               # TypeScript CLI linter and parser (v1.1)
└── examples/                  # Real-world multi-language reference implementations
    ├── 01-distributed-saga-checkout/
    ├── 02-auth-token-revocation/
    └── 03-cdc-stream-consumer/
```

---

## Getting Started

### 1. Configure Your AI Environment

Copy `templates/CURSORRULES.md` to your project's `.cursorrules` or AI agent prompt to force dual-output generation and evidence-anchored contracts:

```markdown
For every code change or feature implementation:
1. Provide the source code implementation.
2. Produce an Assumptions & Constraints Manifest (ACM v1.1) documenting all typed contracts, evidence anchors, and distributed primitives.
```

### 2. Add PR Template Enforcement

Copy `templates/PULL_REQUEST_TEMPLATE.md` into your `.github/` directory:

```bash
cp templates/PULL_REQUEST_TEMPLATE.md .github/PULL_REQUEST_TEMPLATE.md
```

### 3. Run the CLI Validator

Install and run `acm-cli` in your pre-commit hooks or local environment:

```bash
# Validate an ACM file or PR body
npx @open-standards/acm-cli validate --file .acm.md
```

---

## Governance & CI/CD Gating

Add `.github/workflows/acm-governance.yml` to automatically gate pull requests based on boundary completeness, evidence verification, and risk profile:

```yaml
name: "ACM Governance Gate"

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  validate-acm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - name: Validate PR Manifest
        run: npx @open-standards/acm-cli validate --pr-body "${{ github.event.pull_request.body }}"
```

---

## ACM vs. The Software Governance Landscape

| Formalism | Scope & Granularity | Primary Lifecycle Phase | Core Question Answered |
| :--- | :--- | :--- | :--- |
| **Architecture Decision Record (ADR)** | Macro / System-wide | Design & Inception | *"Why did we choose Kafka over RabbitMQ two years ago?"* |
| **OpenAPI / JSON Schema / Protobuf** | System Boundary (I/O) | API Design & Integration | *"What shape and data types does this JSON endpoint accept?"* |
| **Design by Contract (DbC)** | Code Unit (Class / Function) | Runtime Execution | *"What invariants must hold before and after this method runs?"* |
| **Assumptions & Constraints Manifest (ACM)** | **Change Horizon (PR Diff)** | **Code Review & CI Gate** | *"What silent operational boundaries is this implementation assuming right now?"* |

---

## Contributing

We welcome contributions from software architects, engineering leaders, and tooling developers.

1. Review [spec.md](./spec.md) for the core RFC.
2. Fork the repository and create your branch (`feature/my-enhancement`).
3. Ensure all tests and schema linters pass (`npm test` inside `tooling/acm-cli`).
4. Submit a Pull Request containing a valid ACM block in the description.

---

## License

This project is licensed under the [MIT License](./LICENSE.txt).