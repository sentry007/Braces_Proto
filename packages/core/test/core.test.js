import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateJSON,
  repairJSON,
  formatJSON,
  minifyJSON,
  convertContent,
  jsonToTypeScript,
  jsonToZod,
  jsonToJSONSchema,
  jsonToMarkdownTable,
  calculateTokenStats,
  estimateTokens,
  loadTokenizer,
  getTokenizerName,
} from '../dist/index.js';

describe('Bracer core engine', () => {
  const sample = {
    name: 'Braces',
    active: true,
    count: 42,
    tags: ['ai', 'json'],
  };
  const jsonStr = JSON.stringify(sample);

  describe('Validator & Formatter', () => {
    it('validates correct JSON', () => {
      const res = validateJSON(jsonStr);
      assert.strictEqual(res.isValid, true);
    });

    it('identifies invalid JSON with line/column info', () => {
      const res = validateJSON('{ name: "broken" }');
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.message);
    });

    it('formats JSON with custom indent', () => {
      const formatted = formatJSON(jsonStr, 4);
      assert.ok(formatted.includes('    "name": "Braces"'));
    });

    it('minifies JSON', () => {
      const min = minifyJSON(formatJSON(jsonStr, 4));
      assert.strictEqual(min, jsonStr);
    });
  });

  describe('AST JSON Repair Engine', () => {
    it('repairs unquoted keys, single quotes, and python literals', () => {
      const dirty = `{
        name: 'Dirty Payload',
        active: True,
        value: None,
        tags: ['one', 'two',],
      }`;
      const res = repairJSON(dirty);
      assert.strictEqual(res.success, true);
      const parsed = JSON.parse(res.repaired);
      assert.strictEqual(parsed.name, 'Dirty Payload');
      assert.strictEqual(parsed.active, true);
      assert.strictEqual(parsed.value, null);
      assert.deepStrictEqual(parsed.tags, ['one', 'two']);
    });

    it('closes unclosed brackets and braces in proper LIFO order', () => {
      const truncated = '{"user": {"name": "Alice", "items": [1, 2, 3';
      const res = repairJSON(truncated);
      assert.strictEqual(res.success, true);
      const parsed = JSON.parse(res.repaired);
      assert.strictEqual(parsed.user.name, 'Alice');
      assert.deepStrictEqual(parsed.user.items, [1, 2, 3]);
    });

    it('correctly repairs truncated nested array-of-objects without syntax errors', () => {
      const truncatedArray = '[{"id": 1, "title": "First"}, {"id": 2, "title": "Second"';
      const res = repairJSON(truncatedArray);
      assert.strictEqual(res.success, true);
      const parsed = JSON.parse(res.repaired);
      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[1].title, 'Second');
    });

    it('preserves keywords and literals inside string values', () => {
      const literalInString = '{ "note": "There is None here and it is True" }';
      const res = repairJSON(literalInString);
      assert.strictEqual(res.success, true);
      const parsed = JSON.parse(res.repaired);
      assert.strictEqual(parsed.note, 'There is None here and it is True');
    });

    it('strips markdown code blocks', () => {
      const md = '```json\n{"status": "ok"}\n```';
      const res = repairJSON(md);
      assert.strictEqual(res.success, true);
      const parsed = JSON.parse(res.repaired);
      assert.strictEqual(parsed.status, 'ok');
    });
  });

  describe('Bidirectional Polyglot Converters', () => {
    it('converts JSON to YAML and back', () => {
      const yaml = convertContent(jsonStr, 'json', 'yaml');
      assert.ok(yaml.includes('name: Braces'));
      const back = convertContent(yaml, 'yaml', 'json');
      assert.deepStrictEqual(JSON.parse(back), sample);
    });

    it('converts JSON to TOON and back', () => {
      const toon = convertContent(jsonStr, 'json', 'toon');
      assert.ok(toon.length > 0);
      const back = convertContent(toon, 'toon', 'json');
      assert.deepStrictEqual(JSON.parse(back), sample);
    });

    it('converts JSON to TOML and back', () => {
      const toml = convertContent(jsonStr, 'json', 'toml');
      assert.ok(toml.includes('name = "Braces"'));
      const back = convertContent(toml, 'toml', 'json');
      assert.deepStrictEqual(JSON.parse(back), sample);
    });

    it('converts JSON to XML and back', () => {
      const xml = convertContent(jsonStr, 'json', 'xml');
      assert.ok(xml.includes('<name>Braces</name>'));
      const back = convertContent(xml, 'xml', 'json');
      // Multi-key objects are wrapped in a single <root> element to stay well-formed
      assert.strictEqual(JSON.parse(back).root.name, 'Braces');
    });
  });

  describe('Regression: data-safety fixes', () => {
    it('does not rewrite "undefined" or "NaN" inside string values', () => {
      const res = repairJSON('{"msg": "value is undefined here", "n": "NaN inside"}');
      assert.strictEqual(res.success, true);
      assert.deepStrictEqual(JSON.parse(res.repaired), {
        msg: 'value is undefined here',
        n: 'NaN inside',
      });
    });

    it('normalizes bare undefined / NaN / Infinity to null', () => {
      const res = repairJSON('[1, undefined, NaN, Infinity, -Infinity]');
      assert.deepStrictEqual(JSON.parse(res.repaired), [1, null, null, null, null]);
    });

    it('extracts a fenced JSON block surrounded by prose', () => {
      const res = repairJSON('Here is the JSON:\n```json\n{"a": 1,}\n```\nHope that helps!');
      assert.deepStrictEqual(JSON.parse(res.repaired), { a: 1 });
    });

    it('treats valid "null" input as JSON, not as a parse failure', () => {
      assert.strictEqual(convertContent('null', 'json', 'yaml').trim(), 'null');
      assert.strictEqual(minifyJSON('null'), 'null');
    });

    it('reports the parser error for invalid JSON', () => {
      assert.throws(() => convertContent('{bad', 'json', 'yaml'), /Invalid JSON: Cannot convert to YAML/);
    });

    it('CSV uses the union of keys across all rows', () => {
      const csv = convertContent('[{"a":1},{"a":2,"b":3}]', 'json', 'csv');
      assert.strictEqual(csv.split(/\r?\n/)[0], 'a,b');
      assert.ok(csv.includes('2,3'));
    });

    it('CSV flattens nested objects to dot paths', () => {
      const csv = convertContent('[{"user":{"id":1,"name":"A"},"tags":["x"]}]', 'json', 'csv');
      assert.ok(!csv.includes('[object Object]'));
      assert.strictEqual(csv.split(/\r?\n/)[0], 'user.id,user.name,tags');
    });

    it('CSV keeps leading-zero and oversized numbers as strings', () => {
      const json = JSON.parse(convertContent('zip,id,n,ok\n007,12345678901234567890,1.5,true', 'csv', 'json'));
      assert.deepStrictEqual(json, [{ zip: '007', id: '12345678901234567890', n: 1.5, ok: true }]);
    });

    it('XML output always has exactly one root element', () => {
      const xml = convertContent('{"users":[{"id":1},{"id":2}]}', 'json', 'xml');
      assert.ok(xml.startsWith('<?xml'));
      const body = xml.replace(/^<\?xml[^>]*\?>\s*/, '');
      assert.ok(body.startsWith('<root>') && body.trim().endsWith('</root>'));
    });

    it('XML sanitizes invalid element names', () => {
      const xml = convertContent('{"user":{"first name":"A","1st":true}}', 'json', 'xml');
      assert.ok(xml.includes('<first_name>A</first_name>'));
      assert.ok(xml.includes('<_1st>true</_1st>'));
    });

    it('XML keeps leading-zero values as strings', () => {
      const json = JSON.parse(convertContent('<r><zip>007</zip></r>', 'xml', 'json'));
      assert.strictEqual(json.r.zip, '007');
    });

    it('TOML refuses null values instead of silently dropping them', () => {
      assert.throws(
        () => convertContent('{"a":null,"b":1}', 'json', 'toml'),
        /TOML has no null type.*"a"/
      );
    });

    it('TOML supports mixed arrays and arrays of tables', () => {
      const toml = convertContent('{"mixed":[1,"x"],"t":[{"n":1},{"n":2}]}', 'json', 'toml');
      assert.deepStrictEqual(JSON.parse(convertContent(toml, 'toml', 'json')), {
        mixed: [1, 'x'],
        t: [{ n: 1 }, { n: 2 }],
      });
    });

    it('TOON round-trips nested and tabular data', () => {
      const data = { users: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }], nested: [{ a: { b: 1 } }, { c: 2 }] };
      const toon = convertContent(JSON.stringify(data), 'json', 'toon');
      assert.ok(toon.includes('users[2]{id,name}:'));
      assert.deepStrictEqual(JSON.parse(convertContent(toon, 'toon', 'json')), data);
    });

    it('TypeScript generator handles primitive and mixed root arrays', () => {
      assert.strictEqual(jsonToTypeScript('[1,2,3]', 'Ids'), 'export type Ids = number[];');
      const mixed = jsonToTypeScript('[1, {"a":1}]', 'Mixed');
      assert.ok(mixed.includes('export type Mixed = (MixedItem | number)[];'));
    });
  });

  describe('Tokenizer', () => {
    it('counts CJK text far above one token', () => {
      assert.ok(estimateTokens('日本語のテキストです') >= 5);
    });

    it('uses the real o200k_base tokenizer once loaded', async () => {
      const ok = await loadTokenizer();
      assert.strictEqual(ok, true);
      assert.strictEqual(getTokenizerName(), 'o200k_base');
      assert.strictEqual(estimateTokens('hello world'), 2);
      // Special-token text is counted as plain text, not rejected
      assert.ok(estimateTokens('<|endoftext|>') > 1);
    });

    it('measures savings against formatted and minified JSON', () => {
      const stats = calculateTokenStats('{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}');
      assert.strictEqual(stats.tokenizer, 'o200k_base');
      assert.ok(stats.toonTokens < stats.jsonTokens);
      assert.ok(stats.savedVsMinifiedPercent <= stats.savedPercent);
    });
  });

  describe('Schema & Code Generators', () => {
    it('generates TypeScript interfaces with multi-element optional keys', () => {
      const arrayJson = JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ]);
      const ts = jsonToTypeScript(arrayJson, 'User');
      assert.ok(ts.includes('export interface UserItem'));
      assert.ok(ts.includes('id: number;'));
      assert.ok(ts.includes('name: string;'));
      assert.ok(ts.includes('email?: string;'));
    });

    it('generates Zod schema with optional fields', () => {
      const arrayJson = JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ]);
      const zod = jsonToZod(arrayJson, 'UserSchema');
      assert.ok(zod.includes("import { z } from 'zod';"));
      assert.ok(zod.includes('email: z.string().optional()'));
    });

    it('generates JSON Schema Draft 2020-12', () => {
      const schema = jsonToJSONSchema(jsonStr, 'UserConfig');
      const parsed = JSON.parse(schema);
      assert.strictEqual(parsed.title, 'UserConfig');
      assert.strictEqual(parsed.type, 'object');
      assert.strictEqual(parsed.properties.name.type, 'string');
    });

    it('generates Markdown table', () => {
      const md = jsonToMarkdownTable(jsonStr);
      assert.ok(md.includes('| Key | Type | Value |'));
      assert.ok(md.includes('`name`'));
    });
  });

  describe('Token Economy Suite', () => {
    it('estimates token counts and savings', () => {
      const stats = calculateTokenStats(jsonStr);
      assert.ok(stats.jsonTokens > 0);
      assert.ok(typeof stats.savedPercent === 'number');
    });
  });
});
