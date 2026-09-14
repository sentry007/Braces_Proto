import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mcpScript = path.resolve(__dirname, '../dist/index.js');
const child = spawn('node', [mcpScript]);

let buffer = '';

function send(obj) {
  child.stdin.write(JSON.stringify(obj) + '\n');
}

child.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line.trim());

      // 1. Initialize
      if (msg.id === 1) {
        assert.strictEqual(msg.result.serverInfo.name, 'braces-mcp');
        console.log('✔ MCP 2.0 Initialization handshake successful');
        send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      }
      // 2. List tools
      else if (msg.id === 2) {
        const tools = msg.result?.tools || [];
        assert.strictEqual(tools.length, 5);
        console.log(`✔ Tools listed successfully: ${tools.map((t) => t.name).join(', ')}`);

        // Test Tool 1: braces_repair_json
        send({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'braces_repair_json',
            arguments: { input: '[{ name: "item1" }, { name: "item2"' },
          },
        });
      }
      // 3. Tool 1 response -> Test Tool 2: braces_convert_format
      else if (msg.id === 3) {
        const res = JSON.parse(msg.result.content[0].text);
        assert.strictEqual(res.success, true);
        console.log('✔ Tool 1 (braces_repair_json): Repaired truncated array of objects');

        send({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'braces_convert_format',
            arguments: {
              content: '{"user": "Alice", "role": "admin"}',
              fromFormat: 'json',
              toFormat: 'yaml',
            },
          },
        });
      }
      // 4. Tool 2 response -> Test Tool 3: braces_validate_json
      else if (msg.id === 4) {
        const text = msg.result.content[0].text;
        assert.ok(text.includes('user: Alice'));
        console.log('✔ Tool 2 (braces_convert_format): Converted JSON to YAML');

        send({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'braces_validate_json',
            arguments: { jsonString: '{"valid": true}' },
          },
        });
      }
      // 5. Tool 3 response -> Test Tool 4: braces_generate_schema
      else if (msg.id === 5) {
        const res = JSON.parse(msg.result.content[0].text);
        assert.strictEqual(res.isValid, true);
        console.log('✔ Tool 3 (braces_validate_json): Validated JSON syntax');

        send({
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'braces_generate_schema',
            arguments: {
              jsonString: '[{"id": 1, "name": "A"}, {"id": 2, "name": "B", "tag": "dev"}]',
              generator: 'typescript',
              nameHint: 'Account',
            },
          },
        });
      }
      // 6. Tool 4 response -> Test Tool 5: braces_optimize_tokens
      else if (msg.id === 6) {
        const code = msg.result.content[0].text;
        assert.ok(code.includes('export interface AccountItem'));
        assert.ok(code.includes('tag?: string;'));
        console.log('✔ Tool 4 (braces_generate_schema): Generated TypeScript with optionality');

        send({
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: {
            name: 'braces_optimize_tokens',
            arguments: {
              jsonString: '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}',
              targetFormat: 'toon',
            },
          },
        });
      }
      // 7. Tool 5 response -> Finished!
      else if (msg.id === 7) {
        const res = JSON.parse(msg.result.content[0].text);
        assert.strictEqual(res.targetFormat, 'toon');
        assert.ok(res.tokenStats.jsonTokens > 0);
        console.log(`✔ Tool 5 (braces_optimize_tokens): Encoded to TOON (${res.tokenStats.savedPercent}% tokens saved)`);
        console.log('✨ All 5 MCP 2.0 Tools Verified End-to-End!');

        child.kill();
        process.exit(0);
      }
    } catch (e) {
      console.error('Test error:', e);
      child.kill();
      process.exit(1);
    }
  }
});

child.stderr.on('data', (data) => {
  // Stderr is used by MCP for server logs
  // console.log('[MCP Stderr]:', data.toString().trim());
});

// Send Initialize
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mcp-e2e-client', version: '2.0.0' },
  },
});
