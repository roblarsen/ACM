#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import { extractACMBlock, parseAndValidateACM } from './parser.js';

const program = new Command();

program
  .name('acm-cli')
  .description('Validator and governance auditor for Assumptions & Constraints Manifest (ACM v1.2)')
  .version('1.2.0');

program
  .command('validate')
  .description('Validate an ACM block from a file, PR string, or fallback artifact')
  .option('-f, --file <path>', 'Path to markdown file or .acm.md')
  .option('--pr-body <content>', 'Direct string content of a PR body')
  .option('--fallback-file <path>', 'Fallback file path (e.g., .acm.md) if PR body lacks an ACM block')
  .action((options) => {
    let rawContent = '';
    let sourceLabel = '';

    if (options.file) {
      if (!fs.existsSync(options.file)) {
        console.error(chalk.red(`Error: File not found at path "${options.file}"`));
        process.exit(1);
      }
      rawContent = fs.readFileSync(options.file, 'utf-8');
      sourceLabel = `file (${options.file})`;
    } else if (options.prBody !== undefined) {
      const prExtraction = extractACMBlock(options.prBody);
      if (prExtraction.content) {
        rawContent = options.prBody;
        sourceLabel = 'PR description';
      } else if (prExtraction.error && prExtraction.error.includes('Exactly one ACM block')) {
        // Duplicate delimiters are a hard error; don't fall back
        rawContent = options.prBody;
        sourceLabel = 'PR description';
      } else if (options.fallbackFile && fs.existsSync(options.fallbackFile)) {
        rawContent = fs.readFileSync(options.fallbackFile, 'utf-8');
        sourceLabel = `fallback artifact (${options.fallbackFile})`;
        console.log(chalk.cyan(`ℹ No ACM block in PR body; falling back to "${options.fallbackFile}".`));
      } else {
        // Let standard extraction fail below with the PR body's exact error
        rawContent = options.prBody;
        sourceLabel = 'PR description';
      }
    } else {
      console.error(chalk.red('Error: You must provide either --file or --pr-body argument.'));
      process.exit(1);
    }

    const { content: acmBlock, error: extractionError } = extractACMBlock(rawContent);

    if (extractionError || !acmBlock) {
      console.error(chalk.red(`✖ Delimiter Error in ${sourceLabel}: ${extractionError || 'No valid ACM block found.'}`));
      process.exit(1);
    }

    const result = parseAndValidateACM(acmBlock);

    if (!result.isValid) {
      console.error(chalk.red(`\n✖ ACM Validation Failed in ${sourceLabel} (SPEC v1.2 Violation):\n`));
      result.errors.forEach((err) => console.error(chalk.red(`  • ${err}`)));
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\nOperational Warnings:'));
        result.warnings.forEach((warn) => console.log(chalk.yellow(`  ⚠ ${warn}`)));
      }
      process.exit(1);
    }

    console.log(chalk.green(`✔ ACM Validation Passed (${sourceLabel}): Manifest structure and contracts adhere to SPEC v1.2.`));

    if (result.frontmatter) {
      console.log(chalk.cyan('\nManifest Summary:'));
      console.log(`  • Version:     ${result.frontmatter.acm_version}`);
      console.log(`  • Change Type: ${result.frontmatter.change_type}`);
      console.log(`  • Risk Level:  ${result.frontmatter.risk_level.toUpperCase()}`);

      console.log(chalk.cyan('\nContracts Status:'));
      for (const [key, prop] of Object.entries(result.frontmatter.contracts)) {
        let statusColor = chalk.gray;
        if (prop.status === 'guaranteed') statusColor = chalk.green;
        if (prop.status === 'conditional') statusColor = chalk.cyan;
        if (prop.status === 'unsupported') statusColor = chalk.red;
        if (prop.status === 'unknown') statusColor = chalk.yellow;
        console.log(`  • ${key.padEnd(24)}: ${statusColor(prop.status.toUpperCase())}`);
      }

      console.log(chalk.cyan('\nDistributed Primitives:'));
      for (const [key, val] of Object.entries(result.frontmatter.distributed_primitives)) {
        console.log(`  • ${key.padEnd(24)}: ${chalk.magenta(val)}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\nOperational Warnings & Non-Goals:'));
      result.warnings.forEach((warn) => console.log(chalk.yellow(`  ⚠ ${warn}`)));
    }
  });

program.parse(process.argv);