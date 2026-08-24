import { parseJSON } from './validator';

/**
 * Capitalizes string for interface/type names
 */
function toPascalCase(str: string): string {
  return (
    str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^[a-z]/, (chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '') || 'Item'
  );
}

/**
 * Infers TypeScript type definition recursively from a JSON value
 */
export function jsonToTypeScript(jsonString: string, rootName: string = 'RootObject'): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot generate TypeScript types');
  }

  const interfaces: string[] = [];
  const generatedNames = new Set<string>();

  function generateType(value: unknown, nameHint: string): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const type = typeof value;
    if (type === 'string') return 'string';
    if (type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';

    if (Array.isArray(value)) {
      if (value.length === 0) return 'unknown[]';
      const elemType = generateType(value[0], `${nameHint}Item`);
      return `${elemType}[]`;
    }

    if (type === 'object') {
      const obj = value as Record<string, unknown>;
      let interfaceName = toPascalCase(nameHint);
      if (generatedNames.has(interfaceName) && interfaceName !== rootName) {
        interfaceName = `${interfaceName}_${generatedNames.size}`;
      }
      generatedNames.add(interfaceName);

      const fields: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
        const fieldType = generateType(val, key);
        fields.push(`  ${safeKey}: ${fieldType};`);
      }

      const body = `export interface ${interfaceName} {\n${fields.join('\n')}\n}`;
      interfaces.push(body);
      return interfaceName;
    }

    return 'unknown';
  }

  generateType(parsed, rootName);

  return interfaces.reverse().join('\n\n');
}

/**
 * Generates Zod schema from JSON
 */
export function jsonToZod(jsonString: string, rootName: string = 'RootSchema'): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot generate Zod schema');
  }

  function generateZod(value: unknown): string {
    if (value === null) return 'z.null()';
    if (value === undefined) return 'z.undefined()';

    const type = typeof value;
    if (type === 'string') return 'z.string()';
    if (type === 'number') return 'z.number()';
    if (type === 'boolean') return 'z.boolean()';

    if (Array.isArray(value)) {
      if (value.length === 0) return 'z.array(z.unknown())';
      const elem = generateZod(value[0]);
      return `z.array(${elem})`;
    }

    if (type === 'object') {
      const obj = value as Record<string, unknown>;
      const fields: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
        fields.push(`  ${safeKey}: ${generateZod(val)},`);
      }
      return `z.object({\n${fields.join('\n')}\n})`;
    }

    return 'z.unknown()';
  }

  const typeName = rootName.replace(/Schema$/, '');
  const zodBody = generateZod(parsed);

  return `import { z } from 'zod';\n\nexport const ${rootName} = ${zodBody};\n\nexport type ${typeName} = z.infer<typeof ${rootName}>;`;
}

/**
 * Generates JSON Schema (Draft 2020-12) from JSON
 */
export function jsonToJSONSchema(jsonString: string, title: string = 'GeneratedSchema'): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot generate JSON Schema');
  }

  function buildSchema(val: unknown): Record<string, unknown> {
    if (val === null) return { type: 'null' };
    if (typeof val === 'string') return { type: 'string' };
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { type: 'integer' } : { type: 'number' };
    }
    if (typeof val === 'boolean') return { type: 'boolean' };

    if (Array.isArray(val)) {
      return {
        type: 'array',
        items: val.length > 0 ? buildSchema(val[0]) : {},
      };
    }

    if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, unknown>;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [k, v] of Object.entries(obj)) {
        properties[k] = buildSchema(v);
        required.push(k);
      }

      return {
        type: 'object',
        properties,
        required,
        additionalProperties: true,
      };
    }

    return {};
  }

  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title,
    ...buildSchema(parsed),
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Generates a Markdown table representation of JSON
 */
export function jsonToMarkdownTable(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot generate Markdown Table');
  }

  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
    const keys = Array.from(
      new Set(parsed.flatMap((item) => (typeof item === 'object' && item !== null ? Object.keys(item) : [])))
    );

    const header = `| ${keys.join(' | ')} |`;
    const separator = `| ${keys.map(() => '---').join(' | ')} |`;
    const rows = parsed.map((item) => {
      const record = (item || {}) as Record<string, unknown>;
      const cells = keys.map((k) => {
        const val = record[k];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val).replace(/\|/g, '\\|');
        return String(val).replace(/\|/g, '\\|');
      });
      return `| ${cells.join(' | ')} |`;
    });

    return [header, separator, ...rows].join('\n');
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const header = '| Key | Type | Value |';
    const separator = '| --- | --- | --- |';
    const rows = Object.entries(parsed as Record<string, unknown>).map(([k, v]) => {
      const type = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
      const displayVal = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
      return `| \`${k}\` | \`${type}\` | ${displayVal.replace(/\|/g, '\\|')} |`;
    });

    return [header, separator, ...rows].join('\n');
  }

  throw new Error('JSON must be an object or array to generate a Markdown table');
}
