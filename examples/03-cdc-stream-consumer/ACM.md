<!-- ACM-START -->
---
acm_version: "1.1"
change_type: "feature"
risk_level: "critical"
contracts:
  idempotency:
    status: "unsupported"
    failure_mode: "Kafka rebalances or consumer restarts will re-read uncommitted offsets and double-apply balance delta calculations."
  concurrency_safety:
    status: "guaranteed"
    evidence: "Postgres 'UPDATE accounts SET balance = balance + $1' executes atomic row-level write locks in database engine."
  horizontal_scalability:
    status: "conditional"
    conditions: "Requires Kafka topic partition key to be strictly hashed by AccountID across consumer group members."
  strict_ordering:
    status: "guaranteed"
    evidence: "Single partition consumer loop processes messages sequentially via reader.ReadMessage() (consumer.go:21)."
  data_loss_safety:
    status: "unsupported"
    failure_mode: "reader.ReadMessage() auto-commits offset prior to DB write completion. If db.ExecContext fails, message is acknowledged and permanently dropped."
distributed_primitives:
  consistency_model: "eventual"
  delivery_semantics: "at_least_once"
  degradation_mode: "fail_closed"
  backpressure_strategy: "queue_bounded"
tags:
  - "go"
  - "kafka"
  - "streaming"
---

### 1. Invariants & Data Model Boundaries
* **Ordering Guarantee:** Assumes Kafka topic is partitioned strictly by `AccountID` so events for a given account arrive sequentially. If messages are repartitioned, balances will compute out of sequence.
* **Floating-Point Arithmetic:** Uses binary `float64` for currency calculations rather than numeric/fixed-point types (`decimal`), resulting in progressive precision loss over time.

### 2. State & Runtime Topology
* **Partition Scaling:** Running multiple consumer instances on the same partition group processes events safely only if partitioned correctly; cross-partition consumers cause out-of-order race conditions.

### 3. Environmental & Network Assumptions
* **At-Least-Once Delivery Loss:** `reader.ReadMessage` auto-commits the Kafka offset before DB success is verified.
  * If `db.ExecContext` fails (e.g., database network blip or lock timeout), the message is dropped and marked acknowledged in Kafka, resulting in **silent permanent data loss**.

### 4. Explicit Non-Goals & Unhandled Failure Modes
* **Dead-Letter Queue (DLQ):** Poison pills (JSON unmarshal errors) are silently skipped and logged to stdout without routing to a dead-letter queue.
* **Idempotent Deduplication:** No transactional event log (`event_id` tracking table) is checked; consumer group rebalances triggering re-reads double-apply balance deltas.
<!-- ACM-END -->