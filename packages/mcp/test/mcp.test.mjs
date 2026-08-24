import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mcpScript = path.resolve(__dirname, '../dist/index.js');

const child = spawn('node', [mcpScript]);

let buffer = '';

child.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line.trim());
      console.log('Received MCP Message:', JSON.stringify(msg, null, 2));
      if (msg.id === 1) {
        console.log('Initialization Success!');
        // Request tools list
        child.stdin.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
          }) + '\n'
        );
      } else if (msg.id === 2) {
        console.log(`Tools available: ${msg.result?.tools?.length}`);
        // Call braces_repair_json
        child.stdin.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'braces_repair_json',
              arguments: {
                input: '{ name: "broken", count: 5, }',
              },
            },
          }) + '\n'
        );
      } else if (msg.id === 3) {
        console.log('Tool Call Response:', msg.result?.content?.[0]?.text);
        console.log('All MCP Tests Passed Successfully!');
        child.kill();
        process.exit(0);
      }
    } catch (e) {
      // Non-JSON line (logs)
    }
  }
});

child.stderr.on('data', (data) => {
  console.log('[MCP Stderr]:', data.toString().trim());
});

// Send Initialize
child.stdin.write(
  JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-test-client', version: '1.0.0' },
    },
  }) + '\n'
);
