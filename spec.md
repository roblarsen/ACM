# Assumptions & Constraints Manifest (ACM) Specification

* **Specification Version:** 1.0.0-draft  
* **Status:** Draft / Proposed Standard  
* **Date:** 2026-08-17  
* **Authors:** Principal Engineering Governance Working Group  
* **Target Audience:** Software Architects, Engineering Leads, Tooling Authors, AI Agent Framework Developers  

---

## 1. Abstract

The **Assumptions & Constraints Manifest (ACM)** standard establishes a formal, machine-readable, and human-auditable contract format for software modifications. As generative AI systems and automated tooling accelerate Day-1 code production, the primary bottleneck in software delivery shifts from syntax generation to boundary verification. The ACM bridges classic **Design by Contract** principles and **Architecture Decision Records (ADRs)** into everyday development workflows, requiring developers and autonomous agents to explicitly declare implicit runtime, architectural, invariant, and failure boundaries alongside source code diffs.

---

## 2. Terminology & Conformance

The key words **"MUST"**, **"MUST NOT"**, **"REQUIRED"**, **"SHALL"**, **"SHALL NOT"**, **"SHOULD"**, **"SHOULD NOT"**, **"RECOMMENDED"**, **"MAY"**, and **"OPTIONAL"** in this document are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174).

* **ACM Document:** A structured artifact adhering to this specification.
* **Manifest Producer:** An entity (human software engineer, LLM agent, or developer tool) that generates an ACM.
* **Manifest Consumer:** An automated linter, CI pipeline, reviewer agent, or human reviewer that ingests and audits an ACM.
* **Contract Violation:** A condition where implementation logic contradicts or omits an invariant declared within the ACM.

---

## 3. Structural Model

An ACM document consists of two mandatory structural layers:
1. **Machine-Readable Metadata Header:** A YAML Frontmatter block bounded by triple-dashed lines (`---`).
2. **Human-Auditable Contract Taxonomy:** A Markdown-rendered body organized into four mandatory sections and one optional section.

```text
+-------------------------------------------------------------+
| YAML Frontmatter (Machine-Readable Contract & Metadata)     |
| - acm_version, change_type, risk_level, contracts map       |
+-------------------------------------------------------------+
| Markdown Body (Auditable Taxonomies)                        |
| 1. Invariants & Data Model Boundaries                       |
| 2. State & Runtime Topology                                 |
| 3. Environmental & Network Assumptions                      |
| 4. Explicit Non-Goals & Unhandled Failure Modes             |
| 5. Security & Blast Radius Boundaries (Optional)            |
+-------------------------------------------------------------+
```

---

## 4. Metadata Schema Specification (YAML Frontmatter)

The frontmatter MUST appear at the beginning of the manifest and validate against the JSON/YAML schema definitions.

### 4.1 Schema Definition

| Field | Type | Mandatory | Allowed Values / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `acm_version` | String | **REQUIRED** | `"1.0"` | SemVer version of the specification. |
| `change_type` | String | **REQUIRED** | `feature`, `refactor`, `bugfix`, `hotfix`, `infra` | Classification of the pull request or code change. |
| `risk_level` | String | **REQUIRED** | `low`, `medium`, `high`, `critical` | Overall risk assessment based on boundary stability. |
| `contracts` | Object | **REQUIRED** | Key-Value Boolean Map | Core structural invariants enforced at runtime. |
| `contracts.idempotent` | Boolean | **REQUIRED** | `true`, `false` | True if repeated calls produce identical side-effects. |
| `contracts.concurrency_safe` | Boolean | **REQUIRED** | `true`, `false` | True if safe against race conditions under concurrent load. |
| `contracts.horizontal_scale_ready` | Boolean | **REQUIRED** | `true`, `false` | True if safe across multiple stateless node instances. |
| `contracts.strict_ordering_required` | Boolean | **REQUIRED** | `true`, `false` | True if logic depends on strictly ordered event streams. |
| `contracts.data_loss_safe` | Boolean | **REQUIRED** | `true`, `false` | True if failures guarantee zero silent data dropping. |
| `tags` | Array of Strings | **OPTIONAL** | e.g., `["database", "queue", "auth"]` | Architectural domain classification tags. |

### 4.2 Frontmatter Example

```yaml
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
  - "payment-gateway"
  - "in-memory-cache"
---
```

---

## 5. Body Taxonomy Specification (Markdown Sections)

The body of the manifest MUST contain exact Level-3 headings (`###`) matching Sections 5.1 through 5.4. Section 5.5 is OPTIONAL.

### 5.1 Section 1: Invariants & Data Model Boundaries
The producer MUST state every invariant assumed about inputs, schemas, and time semantics.

* **Payload & Type Guarantees:** Assumptions regarding size limits, encoding, presence of null/undefined values, and prior sanitization.
* **Temporal Semantics:** Assumptions regarding time zone formatting (e.g., ISO 8601 UTC), clock skew tolerance, and monotonic timestamps.
* **Identity & Uniqueness:** Assumptions regarding uniqueness of incoming identifiers and entity lifecycle states.

### 5.2 Section 2: State & Runtime Topology
The producer MUST define execution context boundaries and memory residency.

* **Process Isolation:** Whether state is ephemeral, stored in local heap memory, or persisted in shared out-of-process stores (e.g., Redis, Postgres).
* **Concurrency Primitives:** Presence or absence of distributed locks, mutexes, optimistic concurrency controls, or database row locks.
* **Clustering & Replicas:** Operational behavior when running under multi-replica topologies (e.g., Kubernetes pods, serverless invocations).

### 5.3 Section 3: Environmental & Network Assumptions
The producer MUST enumerate dependencies on external networks and systems.

* **Upstream/Downstream Latency & SLA:** Assumptions regarding timeout windows, connection pool exhaustion, and backpressure behavior.
* **Network Reliability & Transport:** Assumptions regarding message delivery guarantees (At-Least-Once, At-Most-Once, Exactly-Once).
* **Third-Party Rate Limits & Quotas:** Assumptions regarding downstream rate-limiting, circuit breakers, and retry backoff strategies.

### 5.4 Section 4: Explicit Non-Goals & Unhandled Failure Modes
The producer MUST list all failure conditions intentionally unhandled in this iteration.

* **Degradation Posture:** Exact behavior when dependencies fail (e.g., hard 500 error, silent ignore, stale data presentation).
* **Deliberate Exclusions:** Edge cases, volume tiers, or failure combinations explicitly out of scope for the current change.
* **Compensating Transactions:** Omission of rollback procedures or Saga orchestrations during partial failures.

### 5.5 Section 5: Security & Blast Radius Boundaries (Optional)
The producer MAY state assumptions regarding authentication, execution privileges, and security boundaries.

* **Privilege Level:** Assumptions regarding caller authorization (e.g., internal-only vs. public endpoint).
* **Data Classification:** Assumptions regarding handling PII, PCI, or credential tokens.

---

## 6. Machine-Readable JSON Schema (`acm.schema.json`)

To enable programmatic validation via linters and CI bots, the frontmatter structure is formally defined by the following JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://standards.open-engineering.org/acm/v1/acm.schema.json",
  "title": "Assumptions & Constraints Manifest Frontmatter",
  "type": "object",
  "required": [
    "acm_version",
    "change_type",
    "risk_level",
    "contracts"
  ],
  "properties": {
    "acm_version": {
      "type": "string",
      "enum": ["1.0"]
    },
    "change_type": {
      "type": "string",
      "enum": ["feature", "refactor", "bugfix", "hotfix", "infra"]
    },
    "risk_level": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"]
    },
    "contracts": {
      "type": "object",
      "required": [
        "idempotent",
        "concurrency_safe",
        "horizontal_scale_ready",
        "strict_ordering_required",
        "data_loss_safe"
      ],
      "properties": {
        "idempotent": { "type": "boolean" },
        "concurrency_safe": { "type": "boolean" },
        "horizontal_scale_ready": { "type": "boolean" },
        "strict_ordering_required": { "type": "boolean" },
        "data_loss_safe": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```

---

## 7. Artifact Storage & Discovery

An ACM artifact MUST be published using one of the following methods:

1. **Pull Request Body Placement:** Integrated directly within the primary Pull Request description enclosed in `<acm>` XML or standard Markdown comment tags:

```markdown
<!-- ACM-START -->
---
acm_version: "1.0"
...
---
### 1. Invariants & Data Model Boundaries
...
<!-- ACM-END -->
```

2. **Co-located File Placement:** Committed alongside code in the source repository at the root or within submodules:
   * Global: `.acm.md` (root directory for monolithic changes).
   * Scoped: `path/to/module/ACM.md` or embedded in architectural component directories.

---

## 8. Governance & CI/CD Enforcement Protocols

Automated CI/CD workflows and repository governance policies SHOULD implement the following enforcement pipeline:

```text
+------------------+     +-------------------+     +---------------------+
| PR Opened / Diff | --> | 1. Structure Lint | --> | 2. Semantic Auditor | --> [Merge Blocked / Permitted]
+------------------+     | (acm-cli parse)   |     | (LLM Diff Cross-Ref)|
                         +-------------------+     +---------------------+
```

1. **Gate 1: Structure & Schema Validation (`acm-cli`)**
   * Verifies frontmatter validity against `acm.schema.json`.
   * Ensures all mandatory H3 headings (Sections 5.1–5.4) exist and contain non-empty bullet points.
   * If `risk_level: "critical"`, CI automatically adds required reviewer rules (e.g., minimum 2 Principal Architect approvals).

2. **Gate 2: Contract vs. Code Cross-Audit**
   * Automated verification agents compare the `git diff` against declared `contracts`.
   * *Example Rule:* If `horizontal_scale_ready: true` is asserted in the frontmatter, but the diff contains module-level in-memory state (`static Map`, global variables), CI fails with a `CONTRACT_CONTRADICTION` error.

3. **Gate 3: Explicit False Acknowledgment**
   * If any contract flag is marked `false` (e.g., `concurrency_safe: false`), the PR reviewer MUST provide explicit signed-off acknowledgment in the approval comment before merging is permitted.

---

## 9. Security Considerations

The ACM document exposes architectural fragilities, unhandled failure modes, and potential concurrency weaknesses. 

* **Public Open-Source Projects:** Teams MUST ensure that unhandled failure modes documented in an ACM do not disclose zero-day vulnerabilities in live production systems before mitigation patches are deployed.
* **Internal Audits:** The ACM serves as an authoritative forensic artifact for post-mortems and security threat modeling.
