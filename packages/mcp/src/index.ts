import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { fileURLToPath } from 'node:url';
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
  type ConversionFormat,
  type GeneratorType,
} from '@braces/core';

// Initialize MCP Server 2.0 instance
export const server = new McpServer(
  {
    name: 'braces-mcp',
    version: '2.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Tool: braces_repair_json
server.registerTool(
  'braces_repair_json',
  {
    description:
      'Auto-repairs dirty, truncated, unquoted, single-quoted, or malformed JSON payloads from LLMs and logs into clean, valid JSON using AST repair.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Malformed, dirty, or truncated JSON string to repair',
        },
      },
      required: ['input'],
    }),
  },
  async (rawArgs: unknown) => {
    const args = rawArgs as { input?: string };
    const input = String(args?.input ?? '');
    try {
      const result = repairJSON(input);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error repairing JSON: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 2. Tool: braces_convert_format
server.registerTool(
  'braces_convert_format',
  {
    description:
      'Bidirectionally converts structured data among JSON, TOON (Token-Oriented Object Notation), YAML, XML, CSV, and TOML formats.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The source data string to convert',
        },
        fromFormat: {
          type: 'string',
          enum: ['json', 'xml', 'csv', 'yaml', 'toml', 'toon'],
          description: 'Source format of the input data',
        },
        toFormat: {
          type: 'string',
          enum: ['json', 'xml', 'csv', 'yaml', 'toml', 'toon'],
          description: 'Target format to convert the data into',
        },
        indent: {
          type: 'number',
          description: 'Indentation spacing (default 2)',
          default: 2,
        },
      },
      required: ['content', 'fromFormat', 'toFormat'],
    }),
  },
  async (rawArgs: unknown) => {
    const args = rawArgs as {
      content?: string;
      fromFormat?: string;
      toFormat?: string;
      indent?: number;
    };
    const content = String(args?.content ?? '');
    const fromFormat = String(args?.fromFormat ?? 'json') as ConversionFormat;
    const toFormat = String(args?.toFormat ?? 'json') as ConversionFormat;
    const indent = typeof args?.indent === 'number' ? args.indent : 2;

    try {
      const converted = convertContent(content, fromFormat, toFormat, indent);
      return {
        content: [
          {
            type: 'text',
            text: converted,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error converting format: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 3. Tool: braces_validate_json
server.registerTool(
  'braces_validate_json',
  {
    description:
      'Validates a JSON string and returns detailed error diagnostics with line and column numbers if syntax errors exist.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        jsonString: {
          type: 'string',
          description: 'The JSON string to validate',
        },
      },
      required: ['jsonString'],
    }),
  },
  async (rawArgs: unknown) => {
    const args = rawArgs as { jsonString?: string };
    const jsonString = String(args?.jsonString ?? '');
    const result = validateJSON(jsonString);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// 4. Tool: braces_generate_schema
server.registerTool(
  'braces_generate_schema',
  {
    description:
      'Generates TypeScript types/interfaces, Zod schemas, Draft 2020-12 JSON Schema, or Markdown comparison tables from structured data.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        jsonString: {
          type: 'string',
          description: 'The JSON string to infer schemas from',
        },
        generator: {
          type: 'string',
          enum: ['typescript', 'zod', 'json-schema', 'markdown-table'],
          description: 'The target schema or code type to generate',
        },
        nameHint: {
          type: 'string',
          description: 'Name hint for root interface or schema (default: "Root")',
          default: 'Root',
        },
      },
      required: ['jsonString', 'generator'],
    }),
  },
  async (rawArgs: unknown) => {
    const args = rawArgs as {
      jsonString?: string;
      generator?: string;
      nameHint?: string;
    };
    const jsonString = String(args?.jsonString ?? '');
    const generator = String(args?.generator ?? 'typescript') as GeneratorType;
    const nameHint = String(args?.nameHint ?? 'Root');

    try {
      let code = '';
      switch (generator) {
        case 'typescript':
          code = jsonToTypeScript(jsonString, nameHint);
          break;
        case 'zod':
          code = jsonToZod(jsonString, `${nameHint}Schema`);
          break;
        case 'json-schema':
          code = jsonToJSONSchema(jsonString, nameHint);
          break;
        case 'markdown-table':
          code = jsonToMarkdownTable(jsonString);
          break;
        default:
          throw new Error(`Unsupported generator: ${generator}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: code,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating schema: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 5. Tool: braces_optimize_tokens
server.registerTool(
  'braces_optimize_tokens',
  {
    description:
      'Optimizes structured data for LLM context windows using TOON / YAML / Minified encoding (saving 30%-60% tokens) and returns comparative token economy statistics.',
    inputSchema: fromJsonSchema({
      type: 'object',
      properties: {
        jsonString: {
          type: 'string',
          description: 'The JSON data payload to optimize for LLM context',
        },
        targetFormat: {
          type: 'string',
          enum: ['toon', 'yaml', 'minified'],
          description: 'The preferred compact encoding (default: "toon")',
          default: 'toon',
        },
      },
      required: ['jsonString'],
    }),
  },
  async (rawArgs: unknown) => {
    const args = rawArgs as {
      jsonString?: string;
      targetFormat?: string;
    };
    const jsonString = String(args?.jsonString ?? '');
    const targetFormat = String(args?.targetFormat ?? 'toon');

    try {
      const stats = calculateTokenStats(jsonString);
      let optimized = '';

      if (targetFormat === 'toon') {
        optimized = jsonToTOON(jsonString);
      } else if (targetFormat === 'yaml') {
        optimized = jsonToYAML(jsonString);
      } else {
        optimized = minifyJSON(jsonString);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                targetFormat,
                tokenStats: stats,
                optimizedPayload: optimized,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error optimizing tokens: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start MCP server on stdio transport
export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Braces MCP Server 2.0 running on stdio');
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
