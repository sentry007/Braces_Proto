// Packs `bracer` and `bracer-mcp` exactly as `npm publish` would, installs the
// tarballs into an empty project, and runs the installed `bracer-mcp` binary.
// Catches packaging mistakes (missing files, unbundled deps) that unit tests miss.
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const work = mkdtempSync(path.join(tmpdir(), 'bracer-pack-'));
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString();

try {
  run(`npm pack --workspace=bracer --workspace=bracer-mcp --pack-destination "${work}"`, root);
  const tarballs = readdirSync(work).filter((f) => f.endsWith('.tgz'));
  assert.equal(tarballs.length, 2, `expected 2 tarballs, got ${tarballs.join(', ')}`);

  const app = path.join(work, 'app');
  mkdirSync(app);
  writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'consumer', private: true }));
  run(`npm install ${tarballs.map((t) => `"${path.join(work, t)}"`).join(' ')} --no-audit --no-fund`, app);

  // The library works from both module systems
  run(`node -e "const b=require('bracer'); if (typeof b.repairJSON !== 'function') process.exit(1)"`, app);
  run(`node --input-type=module -e "import { convertContent } from 'bracer'; if (!convertContent('{\\"a\\":1}','json','yaml').includes('a: 1')) process.exit(1)"`, app);

  // The installed MCP binary answers a real tool call
  const bin = path.join(app, 'node_modules', 'bracer-mcp', 'bin', 'bracer-mcp.js');
  const child = spawn(process.execPath, [bin], { stdio: ['pipe', 'pipe', 'inherit'] });
  const responses = new Map();
  let buffer = '';
  child.stdout.on('data', (d) => {
    buffer += d;
    for (let i; (i = buffer.indexOf('\n')) !== -1; ) {
      const msg = JSON.parse(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
      responses.set(msg.id, msg);
    }
  });
  const send = (m) => child.stdin.write(JSON.stringify(m) + '\n');
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'pack-test', version: '1' } } });
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'bracer_optimize_tokens', arguments: { jsonString: '{"a":[{"x":1},{"x":2}]}' } } });

  const deadline = Date.now() + 20_000;
  while (!responses.has(2) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
  child.kill();

  assert.ok(responses.has(2), 'MCP server answered the tool call');
  const result = responses.get(2).result;
  assert.equal(result.structuredContent.tokenStats.tokenizer, 'o200k_base');
  assert.equal(result.structuredContent.optimizedPayload, 'a[2]{x}:\n  1\n  2');
  console.log('pack test passed: tarballs install cleanly and bracer-mcp serves tools');
} finally {
  rmSync(work, { recursive: true, force: true });
}
