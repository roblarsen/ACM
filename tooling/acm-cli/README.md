# acm-cli

> Command-line linter and governance parser for the **Assumptions & Constraints Manifest (ACM v1.1)** specification.

## Installation

```bash
# Global install
npm install -g acm-cli

# Or run on demand via npx
npx acm-cli validate --file .acm.md
```

## Usage

### Validate a File
```bash
acm-cli validate --file ./path/to/ACM.md
```

### Validate a Pull Request Body
```bash
acm-cli validate --pr-body "$PR_BODY"
```

## Programmatic API

```typescript
import { parseAndValidateACM, extractACMBlock } from 'acm-cli';

const { content, error } = extractACMBlock(prBodyString);
if (content) {
  const result = parseAndValidateACM(content);
  console.log(result.isValid, result.frontmatter?.risk_level);
}
```

## License
MIT