# Assumptions & Constraints Manifest (ACM)

> **A formal open-source engineering standard for boundary verification, explicit contracts, and AI-governed software delivery.**

[![Specification](https://img.shields.io/badge/spec-v1.0.0--draft-blue.svg)](./spec.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

---

## The Problem: The "Happy Path Trap" & AI Velocity

AI developer tooling (Copilot, Cursor, autonomous agents) delivers unprecedented Day-1 velocity. Teams can scaffold features, write unit tests, and generate syntactically clean code in seconds.

However, Day-2 production realities reveal an invisible maintenance debt:

* **Unstated Assumptions:** LLMs make hundreds of silent, implicit architectural assumptions—such as non-atomic database writes, unhandled race conditions, single-replica in-memory state, and unhandled network timeouts.
* **The PR Review Bottleneck:** Reviewers waste significant cognitive effort reverse-engineering what the model or author *assumed*, rather than reviewing actual business intent.
* **Superficial Testing:** Happy-path unit tests easily pass against silent assumptions, only to fail under production concurrency or network partitions.

The **Assumptions & Constraints Manifest (ACM)** standard bridges classic **Design by Contract (Bertrand Meyer)** and **Architecture Decision Records (ADRs)** into the modern pull-request lifecycle.

---

## How It Works

Instead of submitting code alongside a generic PR checklist, authors (and AI agents) must supply an explicit, structured **Assumptions Manifest** as a first-class artifact. 

Reviewers audit the explicit operational boundaries first. If the declared assumptions contradict production reality (e.g., in-memory cache used on an autoscaling cluster), the change is rejected before reviewing implementation details.

```text
[Developer / AI Agent]
         │
         ▼
[Source Code + ACM Block]
         │
         ▼
[CI: acm-cli Lint & Schema Check]
         │
         ▼
[Reviewer Audits Boundaries First → Merge or Reject]
```

---

## Quick Look: Manifest Format

An ACM consists of a machine-readable YAML frontmatter header followed by four auditable markdown taxonomy sections:

```markdown
<!-- ACM-START -->
---
acm_version: "1.0"
change_type: "feature"
risk_level: "high"
contracts:
  idempotent: false
  concurrency_safe: false
  horizontal_scale_ready: false
  strict_ordering_required: true
  data_loss_safe: false
tags:
  - "bullmq"
  - "express"
---

### 1. Invariants & Data Model Boundaries
* **Idempotency:** Non-idempotent. Duplicate requests re-trigger side effects without idempotency key checks.
* **Validation:** Assumes incoming request payloads have been sanitized by upstream middleware.

### 2. State & Runtime Topology
* **Scale Invalidation:** In-memory `Map` used for local rate-limiting; does not persist across container restarts or horizontal replicas.
* **Concurrency:** No row-level locking implemented during balance updates.

### 3. Environmental & Network Assumptions
* **Delivery Guarantees:** Non-transactional. If the database update succeeds but queue dispatch drops due to Redis downtime, no rollback or compensation occurs.

### 4. Explicit Non-Goals & Unhandled Failure Modes
* **Out of Scope:** Handling cross-region active-active synchronization.
* **Degradation:** Returns HTTP 500 hard failure if Redis connection drops.
<!-- ACM-END -->
```

---

## Repository Structure

```text
├── SPEC.md                    # Formal v1.0.0 RFC specification
├── schemas/
│   ├── acm.schema.json        # JSON Schema for machine validation
│   └── acm.schema.yaml        # YAML Schema definition
├── templates/
│   ├── PULL_REQUEST_TEMPLATE.md # Drop-in PR template for GitHub/GitLab
│   └── CURSORRULES.md         # Drop-in rules for Cursor & Copilot agents
├── tooling/
│   └── acm-cli/               # TypeScript CLI linter and parser
└── examples/                  # Real-world reference implementations
```

---

## Getting Started

### 1. Configure Your AI Environment

Add the standard metaprompt rules from `templates/CURSORRULES.md` to your project's `.cursorrules` or AI agent prompt:

```markdown
For every code change or feature implementation:
1. Provide the source code implementation.
2. Produce an Assumptions & Constraints Manifest (ACM v1.0) documenting all implicit runtime, scaling, concurrency, and network boundaries.
```

### 2. Add PR Template Enforcement

Copy `templates/PULL_REQUEST_TEMPLATE.md` into your `.github/` directory:

```bash
cp templates/PULL_REQUEST_TEMPLATE.md .github/PULL_REQUEST_TEMPLATE.md
```

### 3. Run the CLI Validator

Install and run `acm-cli` in your pre-commit hooks or CI pipeline:

```bash
# Install globally or locally
npm install -g @open-standards/acm-cli

# Validate an ACM file or PR body
acm-cli validate --file .acm.md
```

---

## GitHub Actions CI Integration

Add `acm-lint.yml` to `.github/workflows/` to automatically gate pull requests based on boundary completeness and risk profile:

```yaml
name: ACM Governance Gate

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  validate-acm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run ACM Validator
        run: npx @open-standards/acm-cli validate-pr --pr-body "${{ github.event.pull_request.body }}"
```

---

## Contributing

We welcome contributions from software architects, engineering leaders, and tooling developers.

1. Review [SPEC.md](./SPEC.md) for the core RFC.
2. Fork the repository and create your branch (`feature/my-enhancement`).
3. Ensure all tests and schema linters pass (`npm test`).
4. Submit a Pull Request containing a valid ACM block in the description.

---

## License

This project is licensed under the [MIT License](./LICENSE).
