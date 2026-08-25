import YAML from 'yaml';
import { ACMFrontmatterSchema, ACMValidationResult, MANDATORY_SECTIONS } from './types.js';

const ACM_BLOCK_REGEX = /(?:<!--\s*ACM-START\s*-->|<acm>)([\s\S]*?)(?:<!--\s*ACM-END\s*-->|<\/acm>)/i;
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Extracts raw ACM text from PR descriptions or markdown documents.
 */
export function extractACMBlock(input: string): string | null {
  const match = input.match(ACM_BLOCK_REGEX);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Fallback: If input starts directly with frontmatter delimiters
  if (input.trim().startsWith('---')) {
    return input.trim();
  }
  return null;
}

/**
 * Parses and validates an ACM string against SPEC v1.0.0.
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

  // 1. Validate YAML Frontmatter
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

  // 2. Validate Mandatory Markdown Section Headers and Non-Empty Content
  for (const section of MANDATORY_SECTIONS) {
    const escapedHeader = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headerRegex = new RegExp(`###\\s+${escapedHeader}([\\s\\S]*?)(?=###|$)`, 'i');
    const sectionMatch = markdownBody.match(headerRegex);

    if (!sectionMatch) {
      errors.push(`Missing mandatory section header: "### ${section}"`);
    } else {
      const sectionContent = sectionMatch[1]
        .replace(/<!--[\s\S]*?-->/g, '') // remove comments
        .trim();

      if (!sectionContent || sectionContent === '*' || sectionContent === '-') {
        errors.push(`Mandatory section "### ${section}" contains no declared assumptions.`);
      }
    }
  }

  // 3. Risk and Contract Warnings
  if (frontmatter) {
    if (frontmatter.risk_level === 'critical' || frontmatter.risk_level === 'high') {
      warnings.push(`PR is flagged with "${frontmatter.risk_level.toUpperCase()}" risk level.`);
    }

    const contracts = frontmatter.contracts;
    if (!contracts.concurrency_safe) {
      warnings.push('Contract "concurrency_safe" is marked false. Verify multi-thread/race conditions.');
    }
    if (!contracts.horizontal_scale_ready) {
      warnings.push('Contract "horizontal_scale_ready" is marked false. Verify cluster/multi-pod safety.');
    }
    if (!contracts.idempotent) {
      warnings.push('Contract "idempotent" is marked false. Verify client retry behavior.');
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
