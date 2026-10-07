# Bracer for VS Code

Repair broken JSON, convert it to TOON, YAML, XML, CSV or TOML, generate types and schemas, and see the exact token cost of your data, without leaving the editor.

## Features

- **Token counter in the status bar.** For JSON files it shows the `o200k_base` (GPT-4o family) token count and how much TOON would save. Click it to copy the TOON version to your clipboard.
- **Repair JSON.** Fixes LLM output and hand-edited files: code fences, single quotes, unquoted keys, trailing commas, Python `True`/`None`, bare `undefined`/`NaN`, and truncated output. Also available as a Quick Fix on JSON syntax errors.
- **Conversions.** JSON to TOON, YAML, XML, CSV or TOML.
- **Generators.** TypeScript interfaces, Zod schemas, JSON Schema (2020-12) and Markdown tables, opened in a new editor tab.
- **Format and minify.**

Commands work on the current selection, or on the whole file when nothing is selected. Find them in the Command Palette under **Bracer:**, or right-click inside a JSON file. Conversions and generated code open in a new tab, so your file is never overwritten.

## Commands

| Command | Description |
| :-- | :-- |
| `Bracer: Repair JSON` | Repair the selection or the whole file |
| `Bracer: Copy as TOON (for LLM prompts)` | Copy a token-efficient TOON version |
| `Bracer: Convert to TOON / YAML / XML / CSV / TOML` | Open the converted data in a new tab |
| `Bracer: Generate TypeScript Types / Zod Schema / JSON Schema / Markdown Table` | Generate code from sample data |
| `Bracer: Format JSON`, `Bracer: Minify JSON` | Formatting |

Live token counting and the automatic quick fix skip files over 1 MB to keep typing fast. The commands still work on them.

## Privacy

Everything runs locally inside the extension. Your data is never sent anywhere.

## Related

- [`bracer-mcp`](https://www.npmjs.com/package/bracer-mcp): the same tools for AI agents, as an MCP server
- [`bracer`](https://www.npmjs.com/package/bracer): the core library

## License

MIT
