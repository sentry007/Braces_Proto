import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
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

// Initialize MCP server instance
const server = new Server(
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

// Define tool descriptions and JSON schemas
const TOOLS = [
  {
    name: 'braces_repair_json',
    description:
      'Auto-repairs dirty, truncated, unquoted, single-quoted, or malformed JSON payloads from LLMs and logs into clean, valid JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Malformed, dirty, or truncated JSON string to repair',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'braces_convert_format',
    description:
      'Bidirectionally converts structured data among JSON, TOON (Token-Oriented Object Notation), YAML, XML, CSV, and TOML formats.',
    inputSchema: {
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
    },
  },
  {
    name: 'braces_validate_json',
    description:
      'Validates a JSON string and returns detailed error diagnostics with line and column numbers if syntax errors exist.',
    inputSchema: {
      type: 'object',
      properties: {
        jsonString: {
          type: 'string',
          description: 'The JSON string to validate',
        },
      },
      required: ['jsonString'],
    },
  },
  {
    name: 'braces_generate_schema',
    description:
      'Generates TypeScript types/interfaces, Zod schemas, Draft 2020-12 JSON Schema, or Markdown comparison tables from a JSON object/array.',
    inputSchema: {
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
    },
  },
  {
    name: 'braces_optimize_tokens',
    description:
      'Optimizes structured data for LLM context windows using TOON / YAML / Minified encoding (saving 30%-60% tokens) and returns comparative token economy statistics.',
    inputSchema: {
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
    },
  },
];

// Handle ListTools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle CallTool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'braces_repair_json': {
        const input = String(args?.input ?? '');
        const result = repairJSON(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'braces_convert_format': {
        const content = String(args?.content ?? '');
        const fromFormat = String(args?.fromFormat ?? 'json') as ConversionFormat;
        const toFormat = String(args?.toFormat ?? 'json') as ConversionFormat;
        const indent = typeof args?.indent === 'number' ? args.indent : 2;

        const converted = convertContent(content, fromFormat, toFormat, indent);
        return {
          content: [
            {
              type: 'text',
              text: converted,
            },
          ],
        };
      }

      case 'braces_validate_json': {
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

      case 'braces_generate_schema': {
        const jsonString = String(args?.jsonString ?? '');
        const generator = String(args?.generator ?? 'typescript') as GeneratorType;
        const nameHint = String(args?.nameHint ?? 'Root');

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
      }

      case 'braces_optimize_tokens': {
        const jsonString = String(args?.jsonString ?? '');
        const targetFormat = String(args?.targetFormat ?? 'toon');

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
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${msg}`,
        },
      ],
      isError: true,
    };
  }
});

// Start MCP server on stdio transport
export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Braces MCP Server running on stdio');
}

// Auto-run if main module
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('braces-mcp')) {
  runServer().catch((err) => {
    console.error('Fatal MCP Server error:', err);
    process.exit(1);
  });
}
