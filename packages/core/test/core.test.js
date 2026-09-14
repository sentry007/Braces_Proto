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
} from '../dist/index.js';

describe('Braces Core Logic Engine', () => {
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
      assert.ok(JSON.parse(back).name === 'Braces');
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
