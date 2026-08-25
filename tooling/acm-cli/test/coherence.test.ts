import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAndValidateACM } from '../src/parser.js';
import { validManifest } from './fixtures/manifest.js';

function changeManifest(changes: string): string {
  return validManifest.replace('risk_level: high', changes);
}

describe('parseAndValidateACM coherence', () => {
  it('accepts a valid full manifest with all contract statuses', () => {
    assert.equal(parseAndValidateACM(validManifest).isValid, true);
  });

  it('requires meaningful evidence and conditions', () => {
    const shortEvidence = validManifest.replace('evidence: The operation uses a durable request key.', 'evidence: x');
    const shortConditions = validManifest.replace('conditions: Requests are serialized by the database.', 'conditions: x');
    assert.equal(parseAndValidateACM(shortEvidence).isValid, false);
    assert.equal(parseAndValidateACM(shortConditions).isValid, false);
  });

  it('warns for unsupported contracts without failure modes', () => {
    const result = parseAndValidateACM(validManifest.replace('    failure_mode: Events can be observed out of order.\n', ''));
    assert.equal(result.isValid, true);
    assert.ok(result.warnings.some((warning) => warning.includes('failure_mode')));
  });

  it('enforces critical and backpressure risk floors', () => {
    const lowDataLoss = changeManifest('risk_level: low').replace('status: guaranteed\n    evidence: The transaction', 'status: unsupported\n    failure_mode: Data can be lost.\n    evidence: The transaction');
    const lowConcurrency = changeManifest('risk_level: low').replace('status: conditional\n    conditions: Requests', 'status: unsupported\n    failure_mode: Concurrent writes can conflict.\n    conditions: Requests');
    const lowUnknown = changeManifest('risk_level: low').replace('status: guaranteed\n    evidence: The transaction', 'status: unknown\n    evidence: The transaction');
    const lowBuffer = changeManifest('risk_level: low').replace('backpressure_strategy: queue_bounded', 'backpressure_strategy: unbounded_buffer_risk');
    assert.equal(parseAndValidateACM(lowDataLoss).isValid, false);
    assert.equal(parseAndValidateACM(lowConcurrency).isValid, false);
    assert.equal(parseAndValidateACM(lowUnknown).isValid, false);
    assert.equal(parseAndValidateACM(lowBuffer).isValid, false);
  });

  it('warns about at-least-once delivery without idempotency', () => {
    const result = parseAndValidateACM(validManifest.replace('status: guaranteed\n    evidence: The operation', 'status: unsupported\n    failure_mode: Retries duplicate effects.\n    evidence: The operation'));
    assert.ok(result.warnings.some((warning) => warning.includes('At-least-once')));
  });

  it('requires every mandatory section to contain substantive content', () => {
    const missing = validManifest.replace('### 3. Environmental & Network Assumptions', '### 3. Other');
    const empty = validManifest.replace('The request key is unique and durable.', '<!-- comment -->');
    assert.equal(parseAndValidateACM(missing).isValid, false);
    assert.equal(parseAndValidateACM(empty).isValid, false);
    assert.equal(parseAndValidateACM(validManifest.replace('The request key is unique and durable.', '*')).isValid, false);
    assert.equal(parseAndValidateACM(validManifest.replace('The request key is unique and durable.', '-')).isValid, false);
  });
});