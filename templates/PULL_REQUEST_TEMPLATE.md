<!-- .github/PULL_REQUEST_TEMPLATE.md -->

## Summary of Changes
<!-- Provide a concise description of what this PR does and why. Focus on business intent. -->

- 

---

<!-- ACM-START -->
<!--
  ASSUMPTIONS & CONSTRAINTS MANIFEST (ACM) v1.1
  Instructions:
  - Fill out the typed frontmatter contracts and distributed primitives.
  - Contract status options: guaranteed | conditional | unsupported | not_applicable | unknown
  - If "guaranteed", provide an 'evidence' string citing the code path or mechanism.
  - If "conditional", provide a 'conditions' string citing required runtime prerequisites.
  - If "unsupported", provide a 'failure_mode' string explaining the failure behavior.
  - Complete all mandatory narrative sections (1-4) with concrete details.
-->
---
acm_version: "1.1"
change_type: "feature" # Options: feature | refactor | bugfix | hotfix | infra
risk_level: "medium"   # Options: low | medium | high | critical
contracts:
  idempotency:
    status: "unsupported"
    # evidence: ""
    # conditions: ""
    failure_mode: ""
  concurrency_safety:
    status: "unsupported"
    # evidence: ""
    # conditions: ""
    failure_mode: ""
  horizontal_scalability:
    status: "unsupported"
    # evidence: ""
    # conditions: ""
    failure_mode: ""
  strict_ordering:
    status: "not_applicable"
    # evidence: ""
    # conditions: ""
    # failure_mode: ""
  data_loss_safety:
    status: "unsupported"
    # evidence: ""
    # conditions: ""
    failure_mode: ""
distributed_primitives:
  consistency_model: "eventual"       # Options: eventual | read_your_writes | monotonic_reads | linearizable | not_applicable | unknown
  delivery_semantics: "at_least_once" # Options: at_most_once | at_least_once | exactly_once_claimed | not_applicable | unknown
  degradation_mode: "fail_closed"     # Options: fail_closed | fail_open | stale_reads | partial_unavailable | unknown
  backpressure_strategy: "fail_fast"  # Options: fail_fast | queue_bounded | shed_load | unbounded_buffer_risk | not_applicable
tags:
  - "backend"
---

### 1. Invariants & Data Model Boundaries
<!-- What assumptions are made about payloads, schema invariants, uniqueness, and temporal/clock semantics? -->
* **Payload & Validation:** 
* **Temporal Semantics (Timezone/Clock Skew):** 
* **Identity & Duplication:** 

### 2. State & Runtime Topology
<!-- Where does state live (heap vs. shared store)? How does this behave under concurrency and multi-pod auto-scaling? -->
* **Memory & Persistence:** 
* **Concurrency & Locking:** 
* **Clustering & Replicas:** 

### 3. Environmental & Network Assumptions
<!-- What downstream/upstream latency, SLAs, network delivery guarantees, and cross-boundary atomicity are assumed? -->
* **Downstream Latency & Timeouts:** 
* **Delivery Guarantees & Retries:** 
* **Atomicity Across Boundaries (Dual-Write/Sagas):** 

### 4. Explicit Non-Goals & Unhandled Failure Modes
<!-- What edge cases, failure states, or disaster scenarios are intentionally OUT OF SCOPE? -->
* **Unhandled Failure Modes:** 
* **Degradation Behavior (Fail-Closed vs. Fail-Open):** 
* **Compensating Transactions / Rollbacks:** 
<!-- ACM-END -->

---

## Reviewer Contract Sign-Off
<!--
  Mandatory review gate:
  - Required if any contract status is "unsupported" or "unknown".
  - Required if risk_level is "high" or "critical".
-->
- [ ] **Boundary Audit:** I have reviewed the declared **Assumptions & Constraints Manifest** above and verified that the stated contracts, failure modes, and distributed primitives align with our production infrastructure.
- [ ] **Unsupported / Unknown Contract Acceptance:** All contracts marked `unsupported` or `unknown` (e.g., non-idempotent operations, race conditions, dual-write risks) have been evaluated, deemed acceptable for this release cycle, and have associated issue tickets if remediation is needed.
- [ ] **Evidence Verification:** For all contracts marked `guaranteed`, I have confirmed the cited mechanisms (locks, transactions, indexes, idempotency keys) actually exist and function in the code diff.