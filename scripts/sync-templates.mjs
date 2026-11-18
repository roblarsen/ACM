import fs from 'node:fs';
import path from 'node:path';

const CURSOR_MDC_HEADER = `---
description: Enforce Assumptions & Constraints Manifest (ACM v1.2) boundary contracts on code changes
globs: "**/*"
alwaysApply: true
---

`;

const MAPPINGS = [
  {
    src: 'templates/CURSORRULES.md',
    dest: 'AGENTS.md',
    banner: '<!-- AUTO-GENERATED FROM templates/CURSORRULES.md — DO NOT EDIT DIRECTLY -->\n\n'
  },
  {
    src: 'templates/CURSORRULES.md',
    dest: '.github/copilot-instructions.md',
    banner: '<!-- AUTO-GENERATED FROM templates/CURSORRULES.md — DO NOT EDIT DIRECTLY -->\n\n'
  },
  {
    src: 'templates/CURSORRULES.md',
    dest: '.cursor/rules/acm.mdc',
    banner: `${CURSOR_MDC_HEADER}<!-- AUTO-GENERATED FROM templates/CURSORRULES.md — DO NOT EDIT DIRECTLY -->\n\n`
  },
  {
    src: 'templates/CURSORRULES.md',
    dest: '.cursorrules',
    banner: '<!-- AUTO-GENERATED FROM templates/CURSORRULES.md — DO NOT EDIT DIRECTLY -->\n\n'
  },
  {
    src: 'templates/CURSORRULES.md',
    dest: 'CLAUDE.md',
    banner: '<!-- AUTO-GENERATED FROM templates/CURSORRULES.md — DO NOT EDIT DIRECTLY -->\n\n'
  },
  {
    src: 'templates/PULL_REQUEST_TEMPLATE.md',
    dest: '.github/PULL_REQUEST_TEMPLATE.md',
    banner: '<!-- AUTO-GENERATED FROM templates/PULL_REQUEST_TEMPLATE.md — DO NOT EDIT DIRECTLY -->\n\n'
  }
];

const isCheckMode = process.argv.includes('--check');
let outOfSync = false;

for (const { src, dest, banner } of MAPPINGS) {
  const sourceContent = fs.readFileSync(src, 'utf8');
  const expectedContent = `${banner}${sourceContent}`;

  if (isCheckMode) {
    const currentContent = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
    if (currentContent !== expectedContent) {
      console.error(`✖ Drift detected: "${dest}" is out of sync with "${src}". Run "node scripts/sync-templates.mjs".`);
      outOfSync = true;
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, expectedContent, 'utf8');
    console.log(`✔ Synced ${src} -> ${dest}`);
  }
}

if (isCheckMode && outOfSync) {
  process.exit(1);
}

