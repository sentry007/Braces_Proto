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
} from '../dist/index.mjs';

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

  describe('Heuristic JSON Repair Engine', () => {
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

    it('closes unclosed brackets and braces', () => {
      const truncated = '{"user": {"name": "Alice", "items": [1, 2, 3';
      const res = repairJSON(truncated);
      assert.strictEqual(res.success, true);
      const parsed = JSON.parse(res.repaired);
      assert.strictEqual(parsed.user.name, 'Alice');
      assert.deepStrictEqual(parsed.user.items, [1, 2, 3]);
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
    it('generates TypeScript interfaces', () => {
      const ts = jsonToTypeScript(jsonStr, 'UserConfig');
      assert.ok(ts.includes('export interface UserConfig'));
      assert.ok(ts.includes('name: string;'));
      assert.ok(ts.includes('active: boolean;'));
    });

    it('generates Zod schema', () => {
      const zod = jsonToZod(jsonStr, 'UserConfigSchema');
      assert.ok(zod.includes("import { z } from 'zod';"));
      assert.ok(zod.includes('export const UserConfigSchema = z.object({'));
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
