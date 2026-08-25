import YAML from 'yaml';
import { ACMFrontmatterSchema, ACMValidationResult, MANDATORY_SECTIONS, ACMFrontmatter } from './types.js';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const ACM_DELIMITER_REGEX = /<!--\s*ACM-(?:START|END)\s*-->|<\/?acm>/gi;

function findDelimitersOutsideFences(input: string): RegExpMatchArray[] {
  const matches: RegExpMatchArray[] = [];
  let inFence = false;
  let offset = 0;

  for (const line of input.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
    }
    if (!inFence) {
      for (const match of line.matchAll(ACM_DELIMITER_REGEX)) {
        Object.defineProperty(match, 'index', { value: match.index! + offset });
        matches.push(match);
      }
    }
    const separatorLength = input[offset + line.length] === '\r' ? 2 : input[offset + line.length] === '\n' ? 1 : 0;
    offset += line.length + separatorLength;
  }
  return matches;
}

/**
 * Extracts raw ACM text from PR descriptions or markdown documents.
 * Enforces singular delimiter grammar to prevent bypasses.
 */
export function extractACMBlock(input: string): { content: string | null; error?: string } {
  const delimiters = findDelimitersOutsideFences(input);
  const startMatches = delimiters.filter((match) => /START|<acm>/i.test(match[0]));
  const endMatches = delimiters.filter((match) => /END|<\/acm>/i.test(match[0]));

  if (startMatches.length > 1 || endMatches.length > 1) {
    return {
      content: null,
      error: `Grammar Violation: Exactly one ACM block is allowed. Found ${startMatches.length} start delimiters and ${endMatches.length} end delimiters.`
    };
  }

  if (startMatches.length !== endMatches.length) {
    return {
      content: null,
      error: 'Grammar Violation: Mismatched ACM delimiters. Found start delimiter without matching end delimiter.'
    };
  }

  if (startMatches.length === 1 && endMatches.length === 1) {
    const start = startMatches[0].index! + startMatches[0][0].length;
    const end = endMatches[0].index!;
    if (start < end) {
      const content = input.slice(start, end).trim();
      if (!content || !content.replace(/<!--[\s\S]*?-->/g, '').trim().startsWith('---')) {
        return { content: null, error: 'Invalid ACM block: Block must contain YAML frontmatter.' };
      }
      return { content };
    }
  }

  // Fallback: If document is a standalone .acm.md file starting directly with frontmatter
  if (input.trim().startsWith('---')) {
    return { content: input.trim() };
  }

  return {
    content: null,
    error: 'Missing ACM block: PR body must contain <!-- ACM-START --> ... <!-- ACM-END --> delimiters.'
  };
}

/**
 * Validates semantic coherence rules and risk floors across frontmatter contracts.
 */
function validateSemanticCoherence(fm: ACMFrontmatter, errors: string[], warnings: string[]): void {
  const { contracts, distributed_primitives, risk_level } = fm;

  // 1. Evidence and Condition Obligations
  for (const [contractName, prop] of Object.entries(contracts)) {
    if (prop.status === 'guaranteed' && !prop.evidence) {
      errors.push(`Evidence Obligation: Contract "${contractName}" is marked 'guaranteed' but lacks required 'evidence' field.`);
    }
    if (prop.status === 'conditional' && !prop.conditions) {
      errors.push(`Condition Obligation: Contract "${contractName}" is marked 'conditional' but lacks required 'conditions' field.`);
    }
    if (prop.status === 'unsupported' && !prop.failure_mode) {
      warnings.push(`Contract "${contractName}" is 'unsupported' without specifying an explicit 'failure_mode'.`);
    }
  }

  // 2. Risk Floor Rules
  const criticalUnsupported =
    contracts.data_loss_safety.status === 'unsupported' ||
    contracts.data_loss_safety.status === 'unknown' ||
    contracts.concurrency_safety.status === 'unsupported' ||
    contracts.concurrency_safety.status === 'unknown';

  if (criticalUnsupported && risk_level === 'low') {
    errors.push(
      `Risk Floor Violation: 'risk_level' cannot be 'low' when 'data_loss_safety' or 'concurrency_safety' is 'unsupported' or 'unknown'.`
    );
  }

  // 3. Distributed Primitives Cross-Check
  if (
    distributed_primitives.delivery_semantics === 'at_least_once' &&
    contracts.idempotency.status === 'unsupported'
  ) {
    warnings.push(
      `At-least-once delivery with unsupported idempotency will lead to duplicate side-effects during retries.`
    );
  }

  if (
    distributed_primitives.backpressure_strategy === 'unbounded_buffer_risk' &&
    risk_level === 'low'
  ) {
    errors.push(
      `Risk Floor Violation: 'risk_level' cannot be 'low' when 'backpressure_strategy' is 'unbounded_buffer_risk'.`
    );
  }
}

/**
 * Parses and validates an ACM string against SPEC v1.1.0-draft.
 */
export function parseAndValidateACM(rawAcmText: string): ACMValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const fmMatch = rawAcmText.match(FRONTMATTER_REGEX);
  if (!fmMatch) {
    return {
      isValid: false,
      errors: ['Invalid ACM format: Missing YAML frontmatter delimited by "---".'],
      warnings: []
    };
  }

  const [, rawYaml, markdownBody] = fmMatch;

  // 1. Validate YAML Frontmatter against Schema
  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(rawYaml);
  } catch (e) {
    return {
      isValid: false,
      errors: [`YAML Parsing Error: ${(e as Error).message}`],
      warnings: []
    };
  }

  const schemaResult = ACMFrontmatterSchema.safeParse(parsedYaml);
  if (!schemaResult.success) {
    schemaResult.error.errors.forEach((err) => {
      errors.push(`Frontmatter Schema Error at "${err.path.join('.')}": ${err.message}`);
    });
  }

  const frontmatter = schemaResult.success ? schemaResult.data : undefined;

  // 2. Validate Semantic Coherence if frontmatter parsed successfully
  if (frontmatter) {
    validateSemanticCoherence(frontmatter, errors, warnings);
  }

  // 3. Validate Mandatory Markdown Section Headers and Non-Empty Content
  for (const section of MANDATORY_SECTIONS) {
    const escapedHeader = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headerRegex = new RegExp(`###\\s+${escapedHeader}([\\s\\S]*?)(?=###|$)`, 'i');
    const sectionMatch = markdownBody.match(headerRegex);

    if (!sectionMatch) {
      errors.push(`Missing mandatory section header: "### ${section}"`);
    } else {
      const sectionContent = sectionMatch[1]
        .replace(/<!--[\s\S]*?-->/g, '') // strip comments
        .trim();

      if (!sectionContent || sectionContent === '*' || sectionContent === '-') {
        errors.push(`Mandatory section "### ${section}" contains no declared assumptions or evidence.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    frontmatter,
    rawMarkdownBody: markdownBody,
    errors,
    warnings
  };
}