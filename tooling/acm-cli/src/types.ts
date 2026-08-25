import { z } from 'zod';

export const ContractStatusEnum = z.enum([
  'guaranteed',
  'conditional',
  'unsupported',
  'not_applicable',
  'unknown'
]);
export type ContractStatus = z.infer<typeof ContractStatusEnum>;

export const ContractPropertySchema = z.object({
  status: ContractStatusEnum,
  evidence: z.string().min(3).optional(),
  conditions: z.string().min(3).optional(),
  failure_mode: z.string().min(3).optional(),
  scope: z.string().optional()
});
export type ContractProperty = z.infer<typeof ContractPropertySchema>;

export const ConsistencyModelEnum = z.enum([
  'eventual',
  'read_your_writes',
  'monotonic_reads',
  'linearizable',
  'not_applicable',
  'unknown'
]);

export const DeliverySemanticsEnum = z.enum([
  'at_most_once',
  'at_least_once',
  'exactly_once_claimed',
  'not_applicable',
  'unknown'
]);

export const DegradationModeEnum = z.enum([
  'fail_closed',
  'fail_open',
  'stale_reads',
  'partial_unavailable',
  'unknown'
]);

export const BackpressureStrategyEnum = z.enum([
  'fail_fast',
  'queue_bounded',
  'shed_load',
  'unbounded_buffer_risk',
  'not_applicable'
]);

export const ACMFrontmatterSchema = z.object({
  acm_version: z.literal('1.1'),
  change_type: z.enum(['feature', 'refactor', 'bugfix', 'hotfix', 'infra']),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  contracts: z.object({
    idempotency: ContractPropertySchema,
    concurrency_safety: ContractPropertySchema,
    horizontal_scalability: ContractPropertySchema,
    strict_ordering: ContractPropertySchema,
    data_loss_safety: ContractPropertySchema
  }),
  distributed_primitives: z.object({
    consistency_model: ConsistencyModelEnum,
    delivery_semantics: DeliverySemanticsEnum,
    degradation_mode: DegradationModeEnum,
    backpressure_strategy: BackpressureStrategyEnum
  }),
  tags: z.array(z.string()).optional()
});

export type ACMFrontmatter = z.infer<typeof ACMFrontmatterSchema>;

export interface ACMValidationResult {
  isValid: boolean;
  frontmatter?: ACMFrontmatter;
  rawMarkdownBody?: string;
  errors: string[];
  warnings: string[];
}

export const MANDATORY_SECTIONS = [
  '1. Invariants & Data Model Boundaries',
  '2. State & Runtime Topology',
  '3. Environmental & Network Assumptions',
  '4. Explicit Non-Goals & Unhandled Failure Modes'
] as const;