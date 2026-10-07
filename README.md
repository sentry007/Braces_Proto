# ⚡ Bracer

> **A JSON toolkit for LLM workflows.** Repair broken LLM JSON, convert between JSON, TOON, YAML, XML, CSV and TOML, generate types and schemas, and measure the real token cost of your data.
> *Available as a web app, an MCP server, a VS Code extension and a TypeScript library.*

[![CI](https://github.com/sentry007/Braces_Proto/actions/workflows/ci.yml/badge.svg)](https://github.com/sentry007/Braces_Proto/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/sentry007/Braces_Proto/actions/workflows/deploy.yml/badge.svg)](https://github.com/sentry007/Braces_Proto/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

👉 **[Open the web app](https://sentry007.github.io/Braces_Proto/)**

---

## Packages

All four packages share one engine, [`bracer`](./packages/core): pure TypeScript with no DOM dependencies.

| Package | What it is | Install |
| :--- | :--- | :--- |
| [`bracer`](./packages/core) | Core library (ESM + CJS) | `npm install bracer` |
| [`bracer-mcp`](./packages/mcp) | MCP server for Claude Code, Claude Desktop, Cursor, Windsurf, Cline | `npx -y bracer-mcp` |
| [`bracer-vscode`](./packages/vscode) | VS Code / Cursor / Windsurf extension | VS Code Marketplace or Open VSX |
| [`bracer-web`](./packages/web) | Web app: React 19 + Monaco + visual tree editor | [GitHub Pages](https://sentry007.github.io/Braces_Proto/) |

## What it does

- **Repair LLM JSON.** Handles code fences (including prose around them), truncated output, single quotes, unquoted keys, trailing commas, comments, Python `True`/`False`/`None`, and bare `undefined`/`NaN`/`Infinity`. Text inside strings is never rewritten.
- **Convert** JSON ⇄ **TOON** (Token-Oriented Object Notation, via the official [`@toon-format/toon`](https://github.com/toon-format/toon) encoder), YAML, XML, CSV and TOML.
- **Count tokens exactly.** Uses the `o200k_base` tokenizer (GPT-4o family) through [`js-tiktoken`](https://github.com/dqbd/tiktoken). Bracer compares formatted JSON, minified JSON, TOON and YAML, and reports TOON's savings against *both* formatted and minified JSON. Until the tokenizer loads, counts are estimates and are marked with `~`.
- **Generate code** from sample data: TypeScript interfaces (keys missing in some records become optional), Zod schemas, JSON Schema (2020-12) and Markdown tables.

### How much does TOON actually save?

It depends on the shape of your data. TOON does best on **uniform arrays of objects**, where it writes the field names once as a header:

```text
users[2]{id,name}:
  1,Alice
  2,Bob
```

For that example, the exact `o200k_base` counts are:
- **45 tokens** as formatted JSON
- **21 tokens** as minified JSON
- **19 tokens** as TOON

That is 58% fewer tokens than formatted JSON, but only 10% fewer than minified JSON. For deeply nested or irregular data the gain is smaller. Bracer shows the real numbers for *your* payload, so check them rather than relying on a headline figure.

## MCP server

```bash
# Claude Code
claude mcp add bracer -- npx -y bracer-mcp
```

```json
// Claude Desktop / Cursor / Windsurf
{
  "mcpServers": {
    "bracer": { "command": "npx", "args": ["-y", "bracer-mcp"] }
  }
}
```

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `bracer_repair_json` | `input` | Repair malformed or truncated JSON and list the fixes applied |
| `bracer_convert_format` | `content`, `fromFormat`, `toFormat`, `indent?` | Convert between `json`, `toon`, `yaml`, `xml`, `csv`, `toml` |
| `bracer_validate_json` | `jsonString` | Validate JSON and report line and column of the error |
| `bracer_generate_schema` | `jsonString`, `generator`, `nameHint?` | Generate `typescript`, `zod`, `json-schema` or `markdown-table` output |
| `bracer_optimize_tokens` | `jsonString`, `targetFormat?` | Re-encode as `toon`, `yaml` or `minified` and return exact token counts |

## Library

```ts
import { repairJSON, convertContent, jsonToTypeScript, loadTokenizer, calculateTokenStats } from 'bracer';

const { repaired, fixes } = repairJSON("```json\n[{ name: 'Ada', active: True, score: NaN\n```");
// [{ "name": "Ada", "active": true, "score": null }]

const toon = convertContent(json, 'json', 'toon');

await loadTokenizer(); // loads the ~2 MB o200k_base table once
const { jsonTokens, toonTokens, savedPercent, savedVsMinifiedPercent } = calculateTokenStats(json);
```

See [`packages/core/README.md`](./packages/core/README.md) for the full API and per-format conversion notes.

## Web app

- Pick a source format and a target (`From JSON → To TOON`); the output updates as you type. The target menu shows how many tokens each format would cost for your data.
- Errors show inline with the line and column, plus a one-click Repair.
- Code, tree, form and text views for the input; code, table preview and diff views for the output. 50-step undo/redo.
- Open or drag in `.json`, `.toon`, `.yaml`, `.yml`, `.toml`, `.csv` or `.xml` files.
- Three themes, cycled from the header: Indigo and Amber (dark) and Paper (light). The first visit follows your system setting.
- **Privacy:** everything runs in your browser. The editor, fonts and tokenizer are bundled with the app, and the page makes no requests to any other server. An end-to-end test checks this on every build.

## Development

```bash
npm ci              # install all workspaces
npm run build       # build core, web, mcp and vscode
npm test            # core, MCP (over stdio) and VS Code extension tests
npm run test:pack   # pack the npm tarballs, install them, run the MCP binary
npm run test:e2e    # Playwright tests against the production web build
npm run lint        # lint the web app
npm run dev         # web dev server
npm run package --workspace=bracer-vscode   # build the .vsix
```

Releases are published by pushing a `v*` tag (see [`.github/workflows/publish.yml`](./.github/workflows/publish.yml)).

## License

[MIT](./LICENSE)
