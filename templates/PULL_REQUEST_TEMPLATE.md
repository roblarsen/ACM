<!-- .github/PULL_REQUEST_TEMPLATE.md -->

## Summary of Changes
<!-- Provide a concise description of what this PR does and why. Focus on business intent. -->

- 

---

<!-- ACM-START -->
<!--
  ASSUMPTIONS & CONSTRAINTS MANIFEST (ACM) v1.0
  Instructions:
  - Fill out the YAML frontmatter contracts.
  - Complete Sections 1-4. Do NOT remove any mandatory section headers.
  - Be explicit about failure boundaries, concurrency limits, and non-goals.
-->
---
acm_version: "1.0"
change_type: "feature" # Options: feature | refactor | bugfix | hotfix | infra
risk_level: "medium"   # Options: low | medium | high | critical
contracts:
  idempotent: false              # Safe to retry without side-effects?
  concurrency_safe: false        # Safe under high concurrent execution / race conditions?
  horizontal_scale_ready: false  # Safe across multi-instance / stateless cluster deployments?
  strict_ordering_required: false # Depends on guaranteed sequential message arrival?
  data_loss_safe: false          # Guarantees zero silent drop/loss during unhandled exceptions?
tags:
  - "backend"
---

### 1. Invariants & Data Model Boundaries
<!-- What assumptions are made about payloads, types, timestamps, and schema validity? -->
* **Payload & Validation:** 
* **Temporal Semantics (Timezone/Clock):** 
* **Identity & State Lifecycle:** 

### 2. State & Runtime Topology
<!-- Where does state live? How does this behave in multi-replica / auto-scaling environments? -->
* **Memory & Persistence:** 
* **Concurrency & Locking:** 
* **Clustering & Replicas:** 

### 3. Environmental & Network Assumptions
<!-- What downstream/upstream latency, SLAs, timeouts, and network protocols are assumed? -->
* **Downstream Latency & Timeouts:** 
* **Network & Delivery Guarantees:** 
* **Rate Limits & Backpressure:** 

### 4. Explicit Non-Goals & Unhandled Failure Modes
<!-- What edge cases, failure states, or disaster scenarios are intentionally OUT OF SCOPE? -->
* **Unhandled Failure Modes:** 
* **Degradation Behavior (Fail-Open vs. Fail-Closed):** 
* **Compensating Transactions / Rollbacks:** 
<!-- ACM-END -->

---

## Reviewer Contract Sign-Off
<!-- Required before merging if any contract in frontmatter is marked `false` or risk_level is `high`/`critical`. -->
- [ ] I have reviewed the **Assumptions & Constraints Manifest** above and confirm the declared boundaries align with current production infrastructure.
- [ ] All `false` contract declarations (e.g., non-idempotent, concurrency risks) have been evaluated and accepted for this release cycle.
