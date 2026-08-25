import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractACMBlock, parseAndValidateACM } from '../src/parser.js';

describe('ACM v1.1 Parser & Coherence Tests', () => {
  it('should reject PR body with multiple ACM blocks', () => {
    const input = `
      <!-- ACM-START -->
      ---
      acm_version: "1.1"
      ---
      <!-- ACM-END -->
      <!-- ACM-START -->
      ---
      acm_version: "1.1"
      ---
      <!-- ACM-END -->
    `;
    const { content, error } = extractACMBlock(input);
    assert.strictEqual(content, null);
    assert.match(error!, /Exactly one ACM block is allowed/);
  });

  it('should enforce evidence when contract is guaranteed', () => {
    const manifest = `---
acm_version: "1.1"
change_type: "feature"
risk_level: "medium"
contracts:
  idempotency:
    status: "guaranteed"
  concurrency_safety:
    status: "not_applicable"
  horizontal_scalability:
    status: "not_applicable"
  strict_ordering:
    status: "not_applicable"
  data_loss_safety:
    status: "not_applicable"
distributed_primitives:
  consistency_model: "eventual"
  delivery_semantics: "at_least_once"
  degradation_mode: "fail_closed"
  backpressure_strategy: "fail_fast"
---
### 1. Invariants & Data Model Boundaries
* Validated
### 2. State & Runtime Topology
* Validated
### 3. Environmental & Network Assumptions
* Validated
### 4. Explicit Non-Goals & Unhandled Failure Modes
* Validated
`;
    const result = parseAndValidateACM(manifest);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Evidence Obligation')));
  });

  it('should trigger Risk Floor when data_loss_safety is unsupported with risk_level low', () => {
    const manifest = `---
acm_version: "1.1"
change_type: "feature"
risk_level: "low"
contracts:
  idempotency:
    status: "not_applicable"
  concurrency_safety:
    status: "not_applicable"
  horizontal_scalability:
    status: "not_applicable"
  strict_ordering:
    status: "not_applicable"
  data_loss_safety:
    status: "unsupported"
    failure_mode: "Silent drop on DB network timeout"
distributed_primitives:
  consistency_model: "eventual"
  delivery_semantics: "at_least_once"
  degradation_mode: "fail_closed"
  backpressure_strategy: "fail_fast"
---
### 1. Invariants & Data Model Boundaries
* Validated
### 2. State & Runtime Topology
* Validated
### 3. Environmental & Network Assumptions
* Validated
### 4. Explicit Non-Goals & Unhandled Failure Modes
* Validated
`;
    const result = parseAndValidateACM(manifest);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Risk Floor Violation')));
  });
});