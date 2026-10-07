# bracer

JSON toolkit for LLM workflows. Pure TypeScript, no DOM dependencies, ESM + CJS.

- **Repair** broken JSON from LLMs: code fences, prose around the JSON, truncated output, single quotes, unquoted keys, trailing commas, Python `True`/`None`, bare `undefined`/`NaN`.
- **Convert** JSON ⇄ TOON, YAML, XML, CSV, TOML.
- **Generate** TypeScript interfaces, Zod schemas, JSON Schema (2020-12) and Markdown tables from sample data.
- **Count tokens** with the real `o200k_base` tokenizer (GPT-4o family) and compare JSON vs TOON vs YAML vs minified JSON.

```bash
npm install bracer
```

## Usage

```ts
import {
  repairJSON,
  convertContent,
  jsonToTypeScript,
  loadTokenizer,
  calculateTokenStats,
} from 'bracer';

// Repair LLM output
const { success, repaired, fixes } = repairJSON(
  "Sure! Here it is:\n```json\n[{ name: 'Ada', active: True, score: NaN\n```"
);
// repaired: [{ "name": "Ada", "active": true, "score": null }]

// Convert between formats
const toon = convertContent('{"users":[{"id":1,"name":"A"},{"id":2,"name":"B"}]}', 'json', 'toon');
// users[2]{id,name}:
//   1,A
//   2,B

// Generate types (keys missing from some records become optional)
jsonToTypeScript('[{"id":1},{"id":2,"email":"b@x.io"}]', 'User');

// Token stats: load the exact tokenizer once (~2 MB, lazy), then count
await loadTokenizer();
const stats = calculateTokenStats(json);
console.log(stats.savedPercent, stats.savedVsMinifiedPercent, stats.tokenizer);
```

## API

| Function | Description |
| :-- | :-- |
| `repairJSON(input)` | Returns `{ success, repaired, fixes, error? }` |
| `validateJSON(input)` | Returns `{ isValid, error?: { message, line?, column? } }` |
| `tryParseJSON(input)` | `{ ok: true, value }` or `{ ok: false, error }` (handles valid `null`) |
| `formatJSON(input, indent?)` / `minifyJSON(input)` | Pretty-print or minify |
| `convertContent(content, from, to, indent?)` | Formats: `json`, `toon`, `yaml`, `xml`, `csv`, `toml` |
| `jsonToTypeScript` / `jsonToZod` / `jsonToJSONSchema` / `jsonToMarkdownTable` | Code and schema generators |
| `loadTokenizer()` | Loads `o200k_base`; resolves `true` on success |
| `estimateTokens(text)` | Exact count once loaded, heuristic estimate before |
| `calculateTokenStats(json)` | Tokens for formatted JSON, minified JSON, TOON and YAML, plus savings |

### Conversion notes

- **TOON** uses the official [`@toon-format/toon`](https://github.com/toon-format/toon) encoder.
- **CSV** columns are the union of keys across all rows. Nested objects are flattened to dot paths (`user.id`), and arrays are stored as JSON text. When parsing, values like `007` and very large IDs stay strings.
- **XML** output always has a single root element. Multi-key objects are wrapped in `<root>`, and invalid element names are sanitized (`first name` → `first_name`).
- **TOML** has no `null` type, so converting data that contains `null` throws an error naming the path instead of silently dropping it.
- **Token savings:** `savedPercent` compares TOON with 2-space formatted JSON. `savedVsMinifiedPercent` compares it with minified JSON, which is the stricter test. TOON helps most on uniform arrays of objects.

## License

MIT
