<!-- ACM-START -->
---
acm_version: "1.1"
change_type: "feature"
risk_level: "high"
contracts:
  idempotency:
    status: "guaranteed"
    evidence: "Set.add() in logout handler (main.py:16) is inherently idempotent across multiple executions on same process."
  concurrency_safety:
    status: "unsupported"
    failure_mode: "TOKEN_BURST_CACHE dictionary mutation (main.py:32) is not thread-safe under multi-threaded ASGI workers."
  horizontal_scalability:
    status: "unsupported"
    failure_mode: "REVOKED_TOKENS and TOKEN_BURST_CACHE are process-bound in heap memory; revoked tokens remain valid on other Uvicorn workers or container pods."
  strict_ordering:
    status: "not_applicable"
  data_loss_safety:
    status: "unsupported"
    failure_mode: "Process reboot or pod restart clears REVOKED_TOKENS set entirely, silently un-revoking blacklisted tokens."
distributed_primitives:
  consistency_model: "eventual"
  delivery_semantics: "not_applicable"
  degradation_mode: "fail_closed"
  backpressure_strategy: "fail_fast"
tags:
  - "fastapi"
  - "auth"
  - "jwt"
---

### 1. Invariants & Data Model Boundaries
* **Clock Skew:** Assumes system clock is synchronized via NTP. Tokens with standard `exp` claims do not include clock skew leeway.
* **Memory Bounds:** `REVOKED_TOKENS` and `TOKEN_BURST_CACHE` dictionaries grow unboundedly in heap memory without TTL pruning or LRU eviction, leading to OOM crash under sustained load.

### 2. State & Runtime Topology
* **Cluster / Multi-Worker Invalidation:** `REVOKED_TOKENS` is process-local. In a multi-worker setup (e.g., Uvicorn with 4 workers) or multi-pod Kubernetes deployment:
  * Logging out on Worker A will not revoke the token on Worker B, allowing revoked tokens to continue accessing endpoints.
  * Rate limiting is partitioned per process, allowing clients to bypass limits by distributing requests across replicas.

### 3. Environmental & Network Assumptions
* **Cold Restarts:** Process restarts (deployments, container reboots) completely wipe `REVOKED_TOKENS`, silently re-authorizing previously logged-out sessions.

### 4. Explicit Non-Goals & Unhandled Failure Modes
* **Centralized Key-Value Store:** Out of scope for this iteration to use Redis or KeyDB for shared revocation state.
* **Token Expiration Pruning:** No background worker or cron sweeps expired tokens from process memory.
<!-- ACM-END -->