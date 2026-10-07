// End-to-end tests: spawns the built MCP server and talks to it over stdio
// exactly like an MCP client (Claude Code, Cursor, ...) would.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(__dirname, '../bin/bracer-mcp.js');
const REQUEST_TIMEOUT_MS = 15_000;

/** Minimal JSON-RPC client over the server's stdio. */
function startClient() {
  const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  let nextId = 1;
  let buffer = '';

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      const waiter = pending.get(msg.id);
      if (waiter) {
        pending.delete(msg.id);
        clearTimeout(waiter.timer);
        waiter.resolve(msg);
      }
    }
  });

  const send = (msg) => child.stdin.write(JSON.stringify(msg) + '\n');

  return {
    request(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out after ${REQUEST_TIMEOUT_MS}ms`));
        }, REQUEST_TIMEOUT_MS);
        pending.set(id, { resolve, timer });
        send({ jsonrpc: '2.0', id, method, params });
      });
    },
    notify(method, params = {}) {
      send({ jsonrpc: '2.0', method, params });
    },
    close() {
      child.kill();
    },
  };
}

let client;

async function call(name, args) {
  const res = await client.request('tools/call', { name, arguments: args });
  return res;
}

before(async () => {
  client = startClient();
  const init = await client.request('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'bracer-e2e', version: '1.0.0' },
  });
  assert.equal(init.result.serverInfo.name, 'bracer-mcp');
  assert.match(init.result.serverInfo.version, /^\d+\.\d+\.\d+/);
  client.notify('notifications/initialized');
});

after(() => client?.close());

describe('tools/list', () => {
  it('lists all five tools with titles and read-only annotations', async () => {
    const { result } = await client.request('tools/list');
    const names = result.tools.map((t) => t.name).sort();
    assert.deepEqual(names, [
      'bracer_convert_format',
      'bracer_generate_schema',
      'bracer_optimize_tokens',
      'bracer_repair_json',
      'bracer_validate_json',
    ]);
    for (const tool of result.tools) {
      assert.ok(tool.title, `${tool.name} has a title`);
      assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} is read-only`);
      assert.equal(tool.annotations?.openWorldHint, false, `${tool.name} is closed-world`);
    }
    const withOutput = result.tools.filter((t) => t.outputSchema).map((t) => t.name).sort();
    assert.deepEqual(withOutput, ['bracer_optimize_tokens', 'bracer_repair_json', 'bracer_validate_json']);
  });
});

describe('bracer_repair_json', () => {
  it('repairs truncated, fenced LLM output and returns structured content', async () => {
    const { result } = await call('bracer_repair_json', {
      input: "Here you go:\n```json\n[{ name: 'Ada', active: True, score: NaN",
    });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.success, true);
    assert.deepEqual(JSON.parse(result.structuredContent.repaired), [{ name: 'Ada', active: true, score: null }]);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  });

  it('leaves words like "undefined" inside strings alone', async () => {
    const { result } = await call('bracer_repair_json', { input: '{"msg": "value is undefined here",}' });
    assert.equal(JSON.parse(result.structuredContent.repaired).msg, 'value is undefined here');
  });
});

describe('bracer_convert_format', () => {
  it('converts JSON to TOON', async () => {
    const { result } = await call('bracer_convert_format', {
      content: '{"users":[{"id":1,"name":"A"},{"id":2,"name":"B"}]}',
      fromFormat: 'json',
      toFormat: 'toon',
    });
    assert.equal(result.content[0].text, 'users[2]{id,name}:\n  1,A\n  2,B');
  });

  it('round-trips YAML to JSON', async () => {
    const { result } = await call('bracer_convert_format', { content: 'a: 1\nb: [x, y]\n', fromFormat: 'yaml', toFormat: 'json' });
    assert.deepEqual(JSON.parse(result.content[0].text), { a: 1, b: ['x', 'y'] });
  });

  it('reports TOML null values as a tool error', async () => {
    const { result } = await call('bracer_convert_format', { content: '{"a":null}', fromFormat: 'json', toFormat: 'toml' });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /TOML has no null type/);
  });

  it('rejects an unknown format', async () => {
    const res = await call('bracer_convert_format', { content: '{}', fromFormat: 'json', toFormat: 'docx' });
    // Either the SDK rejects the input schema or the tool reports an error; both are acceptable
    assert.ok(res.error || res.result.isError, 'unknown format is rejected');
  });
});

describe('bracer_validate_json', () => {
  it('reports line and column for invalid JSON', async () => {
    const { result } = await call('bracer_validate_json', { jsonString: '{\n  "a": 1\n  "b": 2\n}' });
    assert.equal(result.structuredContent.isValid, false);
    assert.equal(result.structuredContent.error.line, 3);
  });

  it('accepts valid JSON, including a bare null', async () => {
    const { result } = await call('bracer_validate_json', { jsonString: 'null' });
    assert.equal(result.structuredContent.isValid, true);
  });
});

describe('bracer_generate_schema', () => {
  it('generates TypeScript with optional keys', async () => {
    const { result } = await call('bracer_generate_schema', {
      jsonString: '[{"id":1},{"id":2,"email":"b@x.io"}]',
      generator: 'typescript',
      nameHint: 'User',
    });
    assert.match(result.content[0].text, /email\?: string;/);
    assert.match(result.content[0].text, /export type User = UserItem\[\];/);
  });

  it('generates a Zod schema', async () => {
    const { result } = await call('bracer_generate_schema', { jsonString: '{"id":1}', generator: 'zod' });
    assert.match(result.content[0].text, /z\.object\(/);
  });
});

describe('bracer_optimize_tokens', () => {
  it('returns exact o200k_base token counts', async () => {
    const { result } = await call('bracer_optimize_tokens', {
      jsonString: '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}',
    });
    const { tokenStats, optimizedPayload, targetFormat } = result.structuredContent;
    assert.equal(targetFormat, 'toon');
    assert.equal(tokenStats.tokenizer, 'o200k_base');
    assert.equal(tokenStats.jsonTokens, 45);
    assert.equal(tokenStats.toonTokens, 19);
    assert.match(optimizedPayload, /^users\[2\]\{id,name\}:/);
  });

  it('returns an error result for invalid JSON instead of crashing', async () => {
    const { result } = await call('bracer_optimize_tokens', { jsonString: '{oops' });
    assert.equal(result.isError, true);
  });
});

describe('limits', () => {
  it('rejects inputs over the 5 MB cap', async () => {
    const { result } = await call('bracer_validate_json', { jsonString: 'x'.repeat(5_000_001) });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /limit/);
  });
});
