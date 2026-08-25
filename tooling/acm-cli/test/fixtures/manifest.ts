export const validManifest = `---
acm_version: "1.1"
change_type: feature
risk_level: high
contracts:
  idempotency:
    status: guaranteed
    evidence: The operation uses a durable request key.
  concurrency_safety:
    status: conditional
    conditions: Requests are serialized by the database.
  horizontal_scalability:
    status: not_applicable
  strict_ordering:
    status: unsupported
    failure_mode: Events can be observed out of order.
  data_loss_safety:
    status: guaranteed
    evidence: The transaction commits before acknowledgement.
distributed_primitives:
  consistency_model: eventual
  delivery_semantics: at_least_once
  degradation_mode: fail_closed
  backpressure_strategy: queue_bounded
tags: [testing, cli]
---

### 1. Invariants & Data Model Boundaries
The request key is unique and durable.

### 2. State & Runtime Topology
Workers share the transactional database.

### 3. Environmental & Network Assumptions
The database connection can be retried.

### 4. Explicit Non-Goals & Unhandled Failure Modes
Cross-region ordering is not guaranteed.
`;

export function wrapManifest(body = validManifest): string {
  return `<!-- ACM-START -->\n${body}\n<!-- ACM-END -->`;
}