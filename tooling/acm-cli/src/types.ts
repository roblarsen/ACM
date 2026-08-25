import { z } from 'zod';

export const ACMFrontmatterSchema = z.object({
  acm_version: z.literal('1.0'),
  change_type: z.enum(['feature', 'refactor', 'bugfix', 'hotfix', 'infra']),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  contracts: z.object({
    idempotent: z.boolean(),
    concurrency_safe: z.boolean(),
    horizontal_scale_ready: z.boolean(),
    strict_ordering_required: z.boolean(),
    data_loss_safe: z.boolean()
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
