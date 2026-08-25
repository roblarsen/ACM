---
acm_version: "1.1"
change_type: feature
risk_level: high
contracts:
  idempotency: { status: guaranteed, evidence: Durable request keys prevent duplicate execution. }
  concurrency_safety: { status: conditional, conditions: Database serialization is required. }
  horizontal_scalability: { status: not_applicable }
  strict_ordering: { status: not_applicable }
  data_loss_safety: { status: guaranteed, evidence: Transactions commit before acknowledgement. }
distributed_primitives:
  consistency_model: eventual
  delivery_semantics: at_most_once
  degradation_mode: fail_closed
  backpressure_strategy: queue_bounded
---

### 1. Invariants & Data Model Boundaries
Requests have durable identifiers.

### 2. State & Runtime Topology
Workers use shared storage.

### 3. Environmental & Network Assumptions
The database is reachable.

### 4. Explicit Non-Goals & Unhandled Failure Modes
Cross-region ordering is out of scope.