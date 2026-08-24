# ⚡ Braces Reborn

> **The Modern Polyglot JSON Suite & AI Token Economy Engine**  
> *Available as a Web Portal, Model Context Protocol (MCP) Server, and IDE Extension.*

[![Deploy to GitHub Pages](https://github.com/sentry007/Braces_Proto/actions/workflows/deploy.yml/badge.svg)](https://github.com/sentry007/Braces_Proto/actions/workflows/deploy.yml)
[![CI & Build](https://github.com/sentry007/Braces_Proto/actions/workflows/ci.yml/badge.svg)](https://github.com/sentry007/Braces_Proto/actions/workflows/ci.yml)

---

## 🌟 Tri-Platform Ecosystem

Braces Reborn is architected with a shared, pure TypeScript **Core Logic Engine** (`@braces/core`) served across three developer surfaces:

```
                  ┌───────────────────────────────┐
                  │       📦 @braces/core         │
                  │  (Parsers, Converters, Repair │
                  │  Schema Gen, Token Suite)     │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  🌐 Web Portal   │    │  🤖 MCP Server   │    │  💻 IDE Plugin   │
│  (packages/web)  │    │  (packages/mcp)  │    │ (packages/vscode)│
│  React 19+Monaco │    │  Claude / Cursor │    │ Commands, Status │
│  & Visual Tree   │    │  npx braces-mcp  │    │ Bar & Quick Fix  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 🚀 1. Web Portal (GitHub Pages)

A rich, zero-telemetry client-side workspace featuring:
- **🌲 Interactive Drag & Drop AST Editor**: Visually reorder, reparent, and mutate keys/values with zero syntax errors.
- **🔄 Polyglot Bidirectional Converters**: Real-time conversion between `JSON`, `TOON`, `YAML`, `XML`, `CSV`, and `TOML`.
- **🤖 AI Token Suite**: Live token estimation and TOON encoding (saves 30%–60% of LLM context window tokens).
- **🛠️ Heuristic Auto-Repair**: Fixes dirty, truncated, or unquoted LLM JSON outputs locally in your browser.
- **⚡ Code Generators**: 1-click TypeScript types, Zod schemas, JSON Schema (2020-12), and Markdown tables.

---

## 🤖 2. Model Context Protocol (MCP) Server

Connect Braces directly to your AI agents and LLM clients (**Claude Desktop**, **Cursor**, **Antigravity**, **Windsurf**, **Cline**).

### Quickstart (npx)
```bash
npx braces-mcp
```

### Configuration

Add to your **Claude Desktop** (`claude_desktop_config.json`) or **Cursor** (`settings.json`):
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

### Exposed AI Tools
| Tool | Description |
| :--- | :--- |
| `braces_repair_json` | Heuristically repairs malformed, truncated, or unquoted JSON payloads. |
| `braces_convert_format` | Bidirectionally converts data among JSON, TOON, YAML, XML, CSV, TOML. |
| `braces_validate_json` | Validates JSON and returns syntax diagnostics with line & column numbers. |
| `braces_generate_schema` | Generates TypeScript interfaces, Zod schemas, JSON Schema, or Markdown tables. |
| `braces_optimize_tokens` | Encodes data in TOON / YAML to save 30%-60% tokens and returns token stats. |

---

## 💻 3. IDE Extension (VS Code / Antigravity / Cursor)

Install into VS Code, Antigravity IDE, Cursor, or Windsurf:

### Key Features
- **Status Bar Token Counter**: Shows real-time token count and % savings directly in the status bar (`⚡ ~340 tokens (TOON: -42%)`).
- **Right-Click Context Menu & Command Palette**:
  - `Braces: Auto-Repair Broken/Dirty JSON`
  - `Braces: Optimize for AI Context (Copy TOON)`
  - `Braces: Convert to TOON / YAML / XML / CSV / TOML`
  - `Braces: Generate TypeScript Types / Zod / JSON Schema / Markdown`
- **Quick Fix (Code Action)**: Auto-suggests repairing invalid JSON directly from error squigglies.

### Building the `.vsix` Extension
```bash
cd packages/vscode
npm run build
npx @vscode/vsce package --no-dependencies
# Produces braces-vscode-2.1.0.vsix
```

---

## 🛠️ Monorepo Development

Built with standard **npm workspaces**:

```bash
# Clone repository
git clone https://github.com/sentry007/Braces_Proto.git
cd Braces_Proto

# Install all dependencies
npm install

# Run all unit and integration tests
npm test

# Build all workspaces (Core, Web, MCP, VSCode)
npm run build

# Start local web development server
npm run dev
```

---

## 📄 License
MIT License. Built with ❤️ for developers and AI engineers.
