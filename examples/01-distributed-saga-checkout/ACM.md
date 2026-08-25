<!-- ACM-START -->
---
acm_version: "1.1"
change_type: "feature"
risk_level: "critical"
contracts:
  idempotency:
    status: "unsupported"
    failure_mode: "Retrying POST with same payload creates duplicate Stripe charges and multiple inventory holds."
  concurrency_safety:
    status: "unsupported"
    failure_mode: "Time-of-check to time-of-use race: checkStock() and holdStock() interleave under concurrent requests, over-allocating SKU inventory."
  horizontal_scalability:
    status: "guaranteed"
    evidence: "Handler is stateless and relies entirely on external DB and remote APIs; safe for multi-replica pods."
  strict_ordering:
    status: "not_applicable"
  data_loss_safety:
    status: "unsupported"
    failure_mode: "Dual-write failure: If db.orders.create fails after Stripe payment succeeds, the charge is captured but no order record is committed (missing Outbox/Saga)."
distributed_primitives:
  consistency_model: "eventual"
  delivery_semantics: "not_applicable"
  degradation_mode: "fail_closed"
  backpressure_strategy: "fail_fast"
tags:
  - "checkout"
  - "stripe"
  - "distributed-saga"
---

### 1. Invariants & Data Model Boundaries
* **Idempotency:** Non-idempotent. Client network timeouts retrying with the same `orderId` will re-authorize payment and reserve inventory multiple times.
* **Payload Validation:** Assumes `items` array is non-empty and `amountCents` is a positive integer greater than 50 (Stripe minimum). No pre-middleware schema validation is attached.

### 2. State & Runtime Topology
* **Concurrency & Locking:** No distributed lock (Redlock) or transactional row locking exists across the multi-item inventory check loop.
* **Clustering & Replicas:** Stateless Node.js handler safe to scale horizontally, but exposes external inventory services to concurrent race conditions across replicas.

### 3. Environmental & Network Assumptions
* **Dual-Write Vulnerability (Missing Saga):** Non-atomic distributed execution.
  * If `stripeClient.paymentIntents.create` succeeds but `db.orders.create` crashes or times out, the customer is billed, inventory remains held, but no order record exists in the database.
  * If stock reservation succeeds on item #2 but fails on item #3, held stock on item #1 is never released (missing compensating rollback).

### 4. Explicit Non-Goals & Unhandled Failure Modes
* **Compensating Rollbacks:** No two-phase commit, transactional outbox, or Saga orchestrator implemented for partial checkout failures.
* **Degradation:** Network drops during Stripe communication trigger unhandled promise rejections resulting in HTTP 500 without releasing inventory holds.
<!-- ACM-END -->