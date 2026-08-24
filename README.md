# ⚡ Braces Reborn

> **The Modern Polyglot JSON Suite & AI Token Economy Engine**  
> *Available as a Web Portal, Model Context Protocol (MCP) Server, IDE Extension, and Core TypeScript Engine.*

[![Deploy to GitHub Pages](https://github.com/sentry007/Braces_Proto/actions/workflows/deploy.yml/badge.svg)](https://github.com/sentry007/Braces_Proto/actions/workflows/deploy.yml)
[![CI & Build](https://github.com/sentry007/Braces_Proto/actions/workflows/ci.yml/badge.svg)](https://github.com/sentry007/Braces_Proto/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

👉 **[Launch Live Web Portal](https://sentry007.github.io/Braces_Proto/)**

---

## 🌟 Tri-Platform Ecosystem & Monorepo

Braces Reborn is architected with a decoupled, high-performance **Core Logic Engine** (`@braces/core`) written in 100% pure TypeScript with **zero DOM dependencies**, served across three flagship interfaces:

```
                                  ┌───────────────────────────────┐
                                  │       📦 @braces/core         │
                                  │  (Parsers, Converters, Repair │
                                  │  Schema Gen, Token Suite)     │
                                  └───────────────┬───────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 ▼                                ▼                                ▼
      ┌────────────────────┐            ┌───────────────────┐            ┌───────────────────┐
      │   🌐 Web Portal    │            │   🤖 MCP Server   │            │   💻 IDE Plugin   │
      │   (packages/web)   │            │   (packages/mcp)  │            │ (packages/vscode) │
      │  React 19 + Monaco │            │  Claude / Cursor  │            │  Commands, Status │
      │  & Visual Tree DND │            │  npx braces-mcp   │            │  Bar & Quick Fix  │
      └────────────────────┘            └───────────────────┘            └───────────────────┘
```

| Workspace Package | Type | Description |
| :--- | :--- | :--- |
| [`@braces/core`](./packages/core) | Library | Dual ESM/CJS pure engine with parsers, heuristic repair, converters, schema generators, and token counters. |
| [`braces-web`](./packages/web) | Web App | React 19 + Tailwind v4 + Monaco Editor + Drag-and-Drop Visual Tree AST Editor (GitHub Pages). |
| [`braces-mcp`](./packages/mcp) | MCP Server | Model Context Protocol server over `stdio` for Claude Desktop, Cursor, Antigravity, and Windsurf. |
| [`braces-vscode`](./packages/vscode) | IDE Extension | VS Code / Antigravity / Cursor extension with status bar token counter, right-click converters, and quick-fix repair. |

---

## 🚀 1. Web Portal (Client-Side & Zero-Telemetry)

The web portal is a private, client-side developer workspace deployed to [GitHub Pages](https://sentry007.github.io/Braces_Proto/):

- **🌲 Interactive Drag & Drop AST Editor**:
  - Reorder, reparent, and mutate keys/values visually with zero risk of syntax errors (no missing commas, unbalanced braces, or type mismatches).
  - Convert node types on the fly (`string`, `number`, `boolean`, `null`, `object`, `array`).
  - Two-way real-time synchronization between Monaco Code Editor and Visual Tree.
- **🔄 Polyglot Bidirectional Conversion Engine**:
  - **JSON ⇄ TOON** (Token-Oriented Object Notation for LLMs)
  - **JSON ⇄ YAML** (clean indentation, no circular refs)
  - **JSON ⇄ XML** (root wrapping & attribute preservation)
  - **JSON ⇄ CSV** (tabular parsing with header detection)
  - **JSON ⇄ TOML** (top-level key-value mapping)
- **🤖 AI & LLM Token Economy Suite**:
  - **TOON Encoding**: Saves **30%–60% of context window tokens** for arrays and structured records when prompting LLMs (Claude 3.7 / GPT-4o / Gemini).
  - **Live Token Counter**: Real-time BPE token estimations comparing JSON vs. TOON vs. YAML vs. Minified JSON.
- **🛠️ Heuristic Auto-Repair Engine**:
  - Automatically strips markdown code blocks (````json ... ````).
  - Normalizes Python/JS literals (`None` → `null`, `True` → `true`, `False` → `false`, `undefined`/`NaN` → `null`).
  - Converts single quotes (`'key': 'value'`) to double quotes while preserving escaped strings.
  - Quotes unquoted JavaScript object keys (`{ name: "test" }` → `{ "name": "test" }`).
  - Strips trailing commas and balances unclosed brackets/braces from truncated LLM streams.
- **⚡ 1-Click Code & Schema Generators**:
  - **TypeScript Interfaces**: Recursively infers PascalCase interfaces.
  - **Zod Schemas**: Generates `z.object({...})` validation schemas and inferred types.
  - **JSON Schema**: Draft 2020-12 standard compliant schema generation.
  - **Markdown Tables**: Converts tabular JSON objects into GitHub/Notion markdown tables.
- **🛡️ 100% Privacy Sandbox**: All transformations run locally in the browser sandbox. Zero telemetry or server logging.

---

## 🤖 2. Model Context Protocol (MCP) Server

Equip your AI assistants (**Claude Code**, **Claude Desktop**, **Cursor**, **Antigravity IDE**, **Windsurf**, **Cline**) with Braces tools.

### Running with npx
```bash
npx braces-mcp
```

### Configuration

#### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "braces": {
      "command": "npx",
      "args": ["-y", "braces-mcp"]
    }
  }
}
```

#### Claude Code CLI
```bash
claude mcp add braces npx -y braces-mcp
```

#### Local Repository / Development Mode
```json
{
  "mcpServers": {
    "braces": {
      "command": "node",
      "args": ["<PATH_TO_REPO>/packages/mcp/dist/index.js"]
    }
  }
}
```

### Available MCP Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `braces_repair_json` | `input: string` | Repairs malformed, dirty, single-quoted, or truncated JSON payloads into clean, valid JSON. |
| `braces_convert_format` | `content: string`, `fromFormat: string`, `toFormat: string`, `indent?: number` | Bidirectionally converts among `json`, `toon`, `yaml`, `xml`, `csv`, and `toml`. |
| `braces_validate_json` | `jsonString: string` | Validates JSON syntax and returns exact line/column error diagnostics. |
| `braces_generate_schema` | `jsonString: string`, `generator: string`, `nameHint?: string` | Generates `typescript` interfaces, `zod` schemas, `json-schema`, or `markdown-table`. |
| `braces_optimize_tokens` | `jsonString: string`, `targetFormat?: string` | Encodes JSON into TOON/YAML to reduce context window size (30%-60%) and returns token economy metrics. |

---

## 💻 3. IDE Extension (VS Code / Antigravity / Cursor)

The IDE extension brings Braces directly into your code editor workspace.

### Key Features
- **⚡ Status Bar Token Counter**: Displays real-time token count and % savings in the status bar (`⚡ ~340 tokens (TOON: -42%)`). Clicking it copies the token-optimized TOON representation to your clipboard.
- **🖱️ Right-Click Context Menu**:
  - `Braces: Auto-Repair Broken/Dirty JSON`
  - `Braces: Optimize for AI Context (Copy TOON)`
  - `Braces: Convert to TOON / YAML / XML / CSV / TOML`
  - `Braces: Generate TypeScript Types / Zod Schema / JSON Schema / Markdown Table`
- **💡 Quick Fix (Code Action)**: Detects invalid JSON syntax and offers a 1-click Quick Fix to repair the document using the heuristic engine.

### Installing the Extension
1. Download `braces-vscode-2.1.0.vsix` from the [GitHub Releases / CI Artifacts](https://github.com/sentry007/Braces_Proto/actions).
2. Install via command line:
   ```bash
   code --install-extension braces-vscode-2.1.0.vsix
   ```
   *Or in VS Code/Antigravity: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`.*

---

## 📦 4. Using `@braces/core` Programmatically

You can import `@braces/core` directly into any Node.js, Bun, Deno, or Browser project:

```typescript
import {
  repairJSON,
  convertContent,
  validateJSON,
  jsonToTypeScript,
  jsonToZod,
  calculateTokenStats,
} from '@braces/core';

// 1. Repair dirty LLM output
const { success, repaired, fixes } = repairJSON("{ name: 'Dirty', count: 5, }");
console.log(repaired); // {"name": "Dirty", "count": 5}

// 2. Convert JSON to TOON (LLM token optimization)
const toon = convertContent('{"model": "gpt-4o", "active": true}', 'json', 'toon');

// 3. Compute token savings
const stats = calculateTokenStats('{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}');
console.log(`Saved ${stats.savedPercent}% tokens using TOON!`);

// 4. Generate TypeScript interfaces & Zod schemas
const tsInterfaces = jsonToTypeScript('{"id": "usr_123", "balance": 99.5}', 'UserAccount');
const zodSchema = jsonToZod('{"id": "usr_123", "balance": 99.5}', 'UserAccountSchema');
```

---

## 🛠️ Monorepo Development & Scripts

This repository uses **npm workspaces** for instant local linking and lightweight builds:

```bash
# Clone the repository
git clone https://github.com/sentry007/Braces_Proto.git
cd Braces_Proto

# Install dependencies across all workspaces
npm install

# Run all test suites (Core & MCP)
npm test

# Build all workspaces (Core, Web, MCP, VSCode)
npm run build

# Start local web development server with HMR
npm run dev

# Package VS Code .vsix extension
cd packages/vscode && npm run package
```

---

## 📄 License

MIT License. Built with ❤️ for developers, prompt engineers, and AI agent builders.
