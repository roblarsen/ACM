#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import { extractACMBlock, parseAndValidateACM } from './parser.js';

const program = new Command();

program
  .name('acm-cli')
  .description('Validator and governance auditor for Assumptions & Constraints Manifest (ACM v1.0)')
  .version('1.0.0');

program
  .command('validate')
  .description('Validate an ACM block from a file, PR string, or stdin')
  .option('-f, --file <path>', 'Path to markdown file or .acm.md')
  .option('--pr-body <content>', 'Direct string content of a PR body')
  .action((options) => {
    let rawContent = '';

    if (options.file) {
      if (!fs.existsSync(options.file)) {
        console.error(chalk.red(`Error: File not found at path "${options.file}"`));
        process.exit(1);
      }
      rawContent = fs.readFileSync(options.file, 'utf-8');
    } else if (options.prBody) {
      rawContent = options.prBody;
    } else {
      console.error(chalk.red('Error: You must provide either --file or --pr-body argument.'));
      process.exit(1);
    }

    const acmBlock = extractACMBlock(rawContent);

    if (!acmBlock) {
      console.error(chalk.red('✖ Validation Failed: No ACM block found (missing <!-- ACM-START --> or frontmatter).'));
      process.exit(1);
    }

    const result = parseAndValidateACM(acmBlock);

    if (!result.isValid) {
      console.error(chalk.red('\n✖ ACM Validation Failed with errors:\n'));
      result.errors.forEach((err) => console.error(chalk.red(`  • ${err}`)));
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        result.warnings.forEach((warn) => console.log(chalk.yellow(`  ⚠ ${warn}`)));
      }
      process.exit(1);
    }

    console.log(chalk.green('✔ ACM Validation Passed: Manifest structure and contracts adhere to SPEC v1.0.'));

    if (result.frontmatter) {
      console.log(chalk.cyan('\nManifest Summary:'));
      console.log(`  • Version:     ${result.frontmatter.acm_version}`);
      console.log(`  • Change Type: ${result.frontmatter.change_type}`);
      console.log(`  • Risk Level:  ${result.frontmatter.risk_level.toUpperCase()}`);
      console.log('  • Contracts:');
      for (const [key, val] of Object.entries(result.frontmatter.contracts)) {
        const color = val ? chalk.green : chalk.yellow;
        console.log(`      - ${key}: ${color(val)}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\nOperational Warnings & Non-Goals:'));
      result.warnings.forEach((warn) => console.log(chalk.yellow(`  ⚠ ${warn}`)));
    }
  });

program.parse(process.argv);
