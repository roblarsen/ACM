# Assumptions & Constraints Manifest (ACM) Specification

* **Specification Version:** 1.1.0-draft  
* **Status:** Proposed Standard  
* **Date:** 2026-08-24  
* **Authors:** Rob Larsen  
* **Target Audience:** Software Architects, Engineering Leads, Tooling Authors, AI Agent Framework Developers  

---

## 1. Abstract

The **Assumptions & Constraints Manifest (ACM)** standard establishes a formal, machine-readable, and human-auditable contract format for software modifications. As generative AI systems and automated tooling accelerate Day-1 code production, the primary bottleneck in software delivery shifts from syntax generation to boundary verification. 

ACM v1.1 upgrades the standard from structural syntax validation to **typed semantic contracts**. It introduces first-class distributed systems primitives (consistency models, delivery guarantees, degradation modes, backpressure) and enforces **evidence anchoring**—requiring developers and autonomous agents to substantiate runtime safety claims with concrete proof mechanisms or explicitly declare operational failure modes.

---

## 2. Terminology & Conformance

The key words **"MUST"**, **"MUST NOT"**, **"REQUIRED"**, **"SHALL"**, **"SHALL NOT"**, **"SHOULD"**, **"SHOULD NOT"**, **"RECOMMENDED"**, **"MAY"**, and **"OPTIONAL"** in this document are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174).

* **ACM Document:** A structured artifact adhering to this specification.
* **Manifest Producer:** An entity (human software engineer, LLM agent, or developer tool) that generates an ACM.
* **Manifest Consumer:** An automated linter, CI pipeline, reviewer agent, or human reviewer that ingests and audits an ACM.
* **Contract Status:** A discrete operational guarantee state (`guaranteed`, `conditional`, `unsupported`, `not_applicable`, `unknown`).
* **Evidence Anchor:** An explicit reference to a concrete code path, test case, infrastructure dependency, or configuration mechanism proving a contract assertion.
* **Contract Contradiction:** A condition where implementation logic or narrative text contradicts an invariant declared within the frontmatter contracts.

---

## 3. Structural Model

An ACM document consists of two mandatory structural layers:
1. **Machine-Readable Metadata Header:** A YAML Frontmatter block bounded by triple-dashed lines (`---`).
2. **Human-Auditable Contract Taxonomy:** A Markdown-rendered body organized into four mandatory sections and one optional section.

```text
+-------------------------------------------------------------+
| YAML Frontmatter (Machine-Readable Typed Contracts)         |
| - Metadata: acm_version, change_type, risk_level, tags      |
| - Typed Contracts: idempotency, concurrency, scaling, etc.  |
| - Distributed Primitives: consistency, delivery, backpressure|
+-------------------------------------------------------------+
| Markdown Body (Auditable Taxonomies + Evidence Anchors)     |
| 1. Invariants & Data Model Boundaries                       |
| 2. State & Runtime Topology                                 |
| 3. Environmental & Network Assumptions                      |
| 4. Explicit Non-Goals & Unhandled Failure Modes             |
| 5. Security & Blast Radius Boundaries (Optional)            |
+-------------------------------------------------------------+
```

---

## 4. Metadata Schema Specification (YAML Frontmatter)

### 4.1 Contract Status Model

ACM v1.1 replaces flat booleans with the **Typed Contract Model**. Every core operational property MUST specify a `status`:

* **`guaranteed`**: The invariant is strictly enforced and backed by an explicit proof mechanism (e.g., distributed lock, unique DB index, transactional outbox).
* **`conditional`**: The invariant holds ONLY when external prerequisites are satisfied (e.g., requires client-supplied idempotency key with Redis TTL).
* **`unsupported`**: The invariant is NOT guaranteed. The system will experience edge-case failure, data loss, or race conditions under concurrent or partitioned execution.
* **`not_applicable`**: The change has no operational dependency or interaction with this contract domain (e.g., a pure static documentation or styling change).
* **`unknown`**: The runtime boundary has not been analyzed or tested.

### 4.2 Metadata & Contract Properties

| Field | Type | Mandatory | Allowed Values / Schema | Description |
| :--- | :--- | :--- | :--- | :--- |
| `acm_version` | String | **REQUIRED** | `"1.1"` | SemVer version of the specification. |
| `change_type` | String | **REQUIRED** | `feature`, `refactor`, `bugfix`, `hotfix`, `infra` | Classification of the pull request or code change. |
| `risk_level` | String | **REQUIRED** | `low`, `medium`, `high`, `critical` | Overall risk assessment based on boundary stability. |
| `contracts` | Object | **REQUIRED** | Object Map | Core architectural and operational contract declarations. |
| `contracts.idempotency` | Object | **REQUIRED** | Contract Object | Execution repeatability guarantees without duplicate side-effects. |
| `contracts.concurrency_safety` | Object | **REQUIRED** | Contract Object | Protection against race conditions and interleaving. |
| `contracts.horizontal_scalability` | Object | **REQUIRED** | Contract Object | Safety across multi-replica, stateless node clusters. |
| `contracts.strict_ordering` | Object | **REQUIRED** | Contract Object | Dependency on sequential FIFO message/event arrival. |
| `contracts.data_loss_safety` | Object | **REQUIRED** | Contract Object | Protection against silent message dropping or uncommitted writes. |
| `distributed_primitives` | Object | **REQUIRED** | Object Map | Distributed systems execution semantics. |
| `distributed_primitives.consistency_model` | String | **REQUIRED** | `eventual`, `read_your_writes`, `monotonic_reads`, `linearizable`, `not_applicable`, `unknown` | Client read consistency guarantee. |
| `distributed_primitives.delivery_semantics` | String | **REQUIRED** | `at_most_once`, `at_least_once`, `exactly_once_claimed`, `not_applicable`, `unknown` | Message/event bus transport guarantee. |
| `distributed_primitives.degradation_mode` | String | **REQUIRED** | `fail_closed`, `fail_open`, `stale_reads`, `partial_unavailable`, `unknown` | System posture during downstream dependency outages. |
| `distributed_primitives.backpressure_strategy` | String | **REQUIRED** | `fail_fast`, `queue_bounded`, `shed_load`, `unbounded_buffer_risk`, `not_applicable` | Behavior under excessive incoming load. |
| `tags` | Array | **OPTIONAL** | Strings | Subsystem or architectural classification tags. |

### 4.3 Normative Coherence & Risk Floor Rules

A manifest is structurally invalid if it violates any of the following semantic coherence rules:

1. **Risk Floor on Unsupported Data Paths:** If `contracts.data_loss_safety.status` or `contracts.concurrency_safety.status` is set to `unsupported` or `unknown`, `risk_level` MUST NOT be `low`.
2. **Proof Obligation:** If any contract status is set to `guaranteed`, the producer MUST provide a non-empty `evidence` string referencing the exact mechanism (file, line number, lock primitive, or test).
3. **Condition Obligation:** If any contract status is set to `conditional`, the producer MUST provide a non-empty `conditions` string explaining the required operational prerequisites.
4. **Ordering Contradiction:** If `contracts.strict_ordering.status` is `guaranteed` or `conditional`, and `distributed_primitives.delivery_semantics` is `at_least_once`, the manifest MUST document partition keys or sequence deduplication in Section 1.

### 4.4 Frontmatter Example (v1.1)

```yaml
---
acm_version: "1.1"
change_type: "feature"
risk_level: "high"
contracts:
  idempotency:
    status: "conditional"
    conditions: "Requires client to pass 'Idempotency-Key' header with Redis-backed TTL."
  concurrency_safety:
    status: "unsupported"
    failure_mode: "Interleaved balance updates under concurrent checkouts for the same account."
  horizontal_scalability:
    status: "unsupported"
    failure_mode: "Process-local Map cache used; not synchronized across horizontal replicas."
  strict_ordering:
    status: "not_applicable"
  data_loss_safety:
    status: "unsupported"
    failure_mode: "Non-atomic dual write: Postgres commit occurs before Kafka dispatch without Outbox."
distributed_primitives:
  consistency_model: "eventual"
  delivery_semantics: "at_least_once"
  degradation_mode: "fail_closed"
  backpressure_strategy: "unbounded_buffer_risk"
tags:
  - "checkout"
  - "redis"
  - "stripe"
---