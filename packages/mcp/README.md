# bracer-mcp

An MCP server that gives AI agents (Claude Code, Claude Desktop, Cursor, Windsurf, Cline and others) five tools for handling JSON:

- repair broken LLM JSON
- convert between JSON, TOON, YAML, XML, CSV and TOML
- validate JSON
- generate TypeScript, Zod or JSON Schema
- cut prompt tokens with exact `o200k_base` counts

Everything runs locally over stdio. No network calls, no API keys.

## Install

**Claude Code**

```bash
claude mcp add bracer -- npx -y bracer-mcp
```

**Claude Desktop / Cursor / Windsurf** (`mcpServers` config)

```json
{
  "mcpServers": {
    "bracer": {
      "command": "npx",
      "args": ["-y", "bracer-mcp"]
    }
  }
}
```

Requires Node.js 20 or later.

## Tools

| Tool | Parameters | What it does |
| :-- | :-- | :-- |
| `bracer_repair_json` | `input` | Repairs malformed, truncated or fenced JSON (single quotes, unquoted keys, trailing commas, Python literals, `undefined`/`NaN`) and lists the fixes applied |
| `bracer_convert_format` | `content`, `fromFormat`, `toFormat`, `indent?` | Converts between `json`, `toon`, `yaml`, `xml`, `csv` and `toml` |
| `bracer_validate_json` | `jsonString` | Validates JSON and reports line and column of the error |
| `bracer_generate_schema` | `jsonString`, `generator`, `nameHint?` | Generates `typescript`, `zod`, `json-schema` or `markdown-table` output from sample data |
| `bracer_optimize_tokens` | `jsonString`, `targetFormat?` | Re-encodes JSON as `toon`, `yaml` or `minified` and returns exact token counts for each |

## Example prompts

- "This API response got cut off mid-stream. Repair it and give me valid JSON."
- "Convert this CSV export to JSON, then generate a Zod schema for it."
- "How many tokens would this payload cost as TOON instead of JSON?"

## License

MIT
