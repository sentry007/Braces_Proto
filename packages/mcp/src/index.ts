import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  repairJSON,
  convertContent,
  validateJSON,
  jsonToTypeScript,
  jsonToZod,
  jsonToJSONSchema,
  jsonToMarkdownTable,
  jsonToTOON,
  jsonToYAML,
  minifyJSON,
  calculateTokenStats,
  loadTokenizer,
  type ConversionFormat,
  type GeneratorType,
} from 'bracer';

// dist/index.js -> ../package.json (same relative path from src/ during dev)
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

/** Inputs above this size are rejected rather than tying up the agent's session. */
export const MAX_INPUT_CHARS = 5_000_000;

const FORMATS: ConversionFormat[] = ['json', 'toon', 'yaml', 'xml', 'csv', 'toml'];
const GENERATORS: GeneratorType[] = ['typescript', 'zod', 'json-schema', 'markdown-table'];

// Every tool is a pure, local transformation of its input
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Text for clients that read `content`, plus the same data as `structuredContent`. */
function structured(data: Record<string, unknown>): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

/**
 * Wraps a tool handler: rejects oversized string arguments and turns thrown
 * errors into `isError` results instead of protocol failures.
 */
function tool<A extends object>(name: string, handler: (args: A) => ToolResult | string) {
  return async (rawArgs: unknown): Promise<ToolResult> => {
    const args = (rawArgs ?? {}) as A;
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.length > MAX_INPUT_CHARS) {
        return errorResult(`${name}: "${key}" is ${value.length} characters; the limit is ${MAX_INPUT_CHARS}.`);
      }
    }
    try {
      const result = handler(args);
      return typeof result === 'string' ? { content: [{ type: 'text', text: result }] } : result;
    } catch (err) {
      return errorResult(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
}

export const server = new McpServer({ name: 'bracer-mcp', version }, { capabilities: { tools: {} } });

server.registerTool(
  'bracer_repair_json',
  {
    title: 'Repair JSON',
    description:
      'Repairs malformed JSON, typically LLM output: strips markdown code fences and surrounding prose, closes truncated arrays and objects, fixes single quotes, unquoted keys, trailing commas, comments, Python True/False/None, and bare undefined/NaN. Returns the repaired JSON and the list of fixes applied.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        input: { type: 'string', description: 'The malformed or truncated JSON text to repair' },
      },
      required: ['input'],
    }),
    outputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        repaired: { type: 'string', description: 'Repaired JSON, formatted with 2-space indent' },
        fixes: { type: 'array', items: { type: 'string' } },
        error: { type: 'string' },
      },
      required: ['success', 'repaired', 'fixes'],
    }),
    annotations: READ_ONLY,
  },
  tool('bracer_repair_json', (args: { input?: string }) => {
    const result = repairJSON(String(args.input ?? ''));
    return structured({ ...result });
  })
);

server.registerTool(
  'bracer_convert_format',
  {
    title: 'Convert data format',
    description:
      'Converts structured data between JSON, TOON (Token-Oriented Object Notation), YAML, XML, CSV and TOML. CSV output flattens nested objects to dot-path columns; TOML cannot represent null values and reports an error for them.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The data to convert' },
        fromFormat: { type: 'string', enum: FORMATS, description: 'Format of `content`' },
        toFormat: { type: 'string', enum: FORMATS, description: 'Format to convert to' },
        indent: { type: 'number', description: 'Indentation for JSON output (default 2)', default: 2 },
      },
      required: ['content', 'fromFormat', 'toFormat'],
    }),
    annotations: READ_ONLY,
  },
  tool('bracer_convert_format', (args: { content?: string; fromFormat?: string; toFormat?: string; indent?: number }) => {
    const from = String(args.fromFormat) as ConversionFormat;
    const to = String(args.toFormat) as ConversionFormat;
    if (!FORMATS.includes(from) || !FORMATS.includes(to)) {
      throw new Error(`Formats must be one of: ${FORMATS.join(', ')}`);
    }
    const indent = typeof args.indent === 'number' ? args.indent : 2;
    return convertContent(String(args.content ?? ''), from, to, indent);
  })
);

server.registerTool(
  'bracer_validate_json',
  {
    title: 'Validate JSON',
    description: 'Checks whether a string is valid JSON. For invalid JSON, returns the parser message with the line and column of the error.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        jsonString: { type: 'string', description: 'The JSON text to validate' },
      },
      required: ['jsonString'],
    }),
    outputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            line: { type: 'number' },
            column: { type: 'number' },
          },
          required: ['message'],
        },
      },
      required: ['isValid'],
    }),
    annotations: READ_ONLY,
  },
  tool('bracer_validate_json', (args: { jsonString?: string }) => structured({ ...validateJSON(String(args.jsonString ?? '')) }))
);

server.registerTool(
  'bracer_generate_schema',
  {
    title: 'Generate types or schema',
    description:
      'Generates TypeScript interfaces, a Zod schema, a JSON Schema (draft 2020-12) or a Markdown table from sample JSON. Keys missing from some records in an array become optional.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        jsonString: { type: 'string', description: 'Sample JSON data to infer types from' },
        generator: { type: 'string', enum: GENERATORS, description: 'What to generate' },
        nameHint: { type: 'string', description: 'Name for the root type or schema (default "Root")', default: 'Root' },
      },
      required: ['jsonString', 'generator'],
    }),
    annotations: READ_ONLY,
  },
  tool('bracer_generate_schema', (args: { jsonString?: string; generator?: string; nameHint?: string }) => {
    const json = String(args.jsonString ?? '');
    const name = String(args.nameHint ?? 'Root');
    switch (args.generator as GeneratorType) {
      case 'typescript':
        return jsonToTypeScript(json, name);
      case 'zod':
        return jsonToZod(json, `${name}Schema`);
      case 'json-schema':
        return jsonToJSONSchema(json, name);
      case 'markdown-table':
        return jsonToMarkdownTable(json);
      default:
        throw new Error(`generator must be one of: ${GENERATORS.join(', ')}`);
    }
  })
);

server.registerTool(
  'bracer_optimize_tokens',
  {
    title: 'Optimize tokens',
    description:
      'Re-encodes JSON as TOON, YAML or minified JSON to use fewer tokens in an LLM prompt, and returns exact o200k_base token counts for formatted JSON, minified JSON, YAML and TOON so you can pick the cheapest. TOON saves the most on uniform arrays of objects.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        jsonString: { type: 'string', description: 'The JSON data to re-encode' },
        targetFormat: { type: 'string', enum: ['toon', 'yaml', 'minified'], description: 'Encoding to return (default "toon")', default: 'toon' },
      },
      required: ['jsonString'],
    }),
    outputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        targetFormat: { type: 'string' },
        optimizedPayload: { type: 'string' },
        tokenStats: {
          type: 'object',
          properties: {
            jsonTokens: { type: 'number' },
            minifiedTokens: { type: 'number' },
            yamlTokens: { type: 'number' },
            toonTokens: { type: 'number' },
            savedPercent: { type: 'number' },
            savedVsMinifiedPercent: { type: 'number' },
            tokenizer: { type: 'string' },
          },
        },
      },
      required: ['targetFormat', 'optimizedPayload', 'tokenStats'],
    }),
    annotations: READ_ONLY,
  },
  tool('bracer_optimize_tokens', (args: { jsonString?: string; targetFormat?: string }) => {
    const json = String(args.jsonString ?? '');
    const targetFormat = String(args.targetFormat ?? 'toon');
    const optimizedPayload =
      targetFormat === 'yaml' ? jsonToYAML(json) : targetFormat === 'minified' ? minifyJSON(json) : jsonToTOON(json);
    return structured({ targetFormat, optimizedPayload, tokenStats: { ...calculateTokenStats(json) } });
  })
);

export async function runServer() {
  // Load the real o200k_base tokenizer before serving, so token counts are exact
  const exactTokens = await loadTokenizer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Bracer MCP server v${version} running on stdio (tokenizer: ${exactTokens ? 'o200k_base' : 'estimate'})`);
}

// Auto-run if executed directly as main script (e.g. node dist/index.js)
const currentPath = fileURLToPath(import.meta.url);
const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (executedPath && path.resolve(currentPath) === executedPath) {
  runServer().catch((err) => {
    console.error('Fatal MCP Server error:', err);
    process.exit(1);
  });
}
