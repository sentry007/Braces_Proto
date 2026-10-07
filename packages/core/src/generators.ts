import { requireJSON } from './validator';

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
 * Checks if a key is a safe JS identifier
 */
function isSafeIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

/**
 * Infers TypeScript type definition recursively from a JSON value with
 * multi-element inspection and optionality detection for arrays of records.
 */
export function jsonToTypeScript(jsonString: string, rootName: string = 'RootObject'): string {
  const parsed = requireJSON(jsonString, 'Cannot generate TypeScript types');

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

      // Check if array items are objects
      const objectItems = value.filter(
        (it) => typeof it === 'object' && it !== null && !Array.isArray(it)
      ) as Record<string, unknown>[];

      if (objectItems.length > 0) {
        // Multi-element inspection: merge all keys and detect optionality
        const allKeys = Array.from(new Set(objectItems.flatMap((item) => Object.keys(item))));
        let interfaceName = toPascalCase(nameHint.endsWith('Item') ? nameHint : `${nameHint}Item`);
        if (generatedNames.has(interfaceName)) {
          interfaceName = `${interfaceName}_${generatedNames.size}`;
        }
        generatedNames.add(interfaceName);

        const fields: string[] = [];
        for (const key of allKeys) {
          const isOptional = objectItems.some((item) => !(key in item));
          const safeKey = isSafeIdentifier(key) ? key : JSON.stringify(key);
          const keyModifier = isOptional ? '?:' : ':';

          // Collect types for this key across all objects
          const valTypes = new Set<string>();
          for (const item of objectItems) {
            if (key in item) {
              valTypes.add(generateType(item[key], key));
            }
          }
          const fieldType = valTypes.size > 0 ? Array.from(valTypes).join(' | ') : 'unknown';
          fields.push(`  ${safeKey}${keyModifier} ${fieldType};`);
        }

        const body = `export interface ${interfaceName} {\n${fields.join('\n')}\n}`;
        interfaces.push(body);

        // Keep non-object members of mixed arrays like [1, {...}]
        const otherTypes = Array.from(
          new Set(
            value
              .filter((it) => !(typeof it === 'object' && it !== null && !Array.isArray(it)))
              .map((it) => generateType(it, `${nameHint}Item`))
          )
        );
        if (otherTypes.length === 0) return `${interfaceName}[]`;
        return `(${[interfaceName, ...otherTypes].join(' | ')})[]`;
      }

      // Heterogeneous primitive array
      const types = Array.from(new Set(value.map((item) => generateType(item, `${nameHint}Item`))));
      if (types.length === 1) return `${types[0]}[]`;
      return `(${types.join(' | ')})[]`;
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
        const safeKey = isSafeIdentifier(key) ? key : JSON.stringify(key);
        const fieldType = generateType(val, key);
        fields.push(`  ${safeKey}: ${fieldType};`);
      }

      const body = `export interface ${interfaceName} {\n${fields.join('\n')}\n}`;
      interfaces.push(body);
      return interfaceName;
    }

    return 'unknown';
  }

  const rootType = generateType(parsed, rootName);
  const output = interfaces.reverse();

  // Roots that aren't a plain object (arrays, primitives) get a named type alias
  const rootTypeName = toPascalCase(rootName);
  if (rootType !== rootTypeName) {
    output.push(`export type ${rootTypeName} = ${rootType};`);
  }

  return output.join('\n\n');
}

/**
 * Generates Zod schema from JSON with multi-element inspection
 */
export function jsonToZod(jsonString: string, rootName: string = 'RootSchema'): string {
  const parsed = requireJSON(jsonString, 'Cannot generate Zod schema');

  function generateZod(value: unknown): string {
    if (value === null) return 'z.null()';
    if (value === undefined) return 'z.undefined()';

    const type = typeof value;
    if (type === 'string') return 'z.string()';
    if (type === 'number') return 'z.number()';
    if (type === 'boolean') return 'z.boolean()';

    if (Array.isArray(value)) {
      if (value.length === 0) return 'z.array(z.unknown())';

      const objectItems = value.filter(
        (it) => typeof it === 'object' && it !== null && !Array.isArray(it)
      ) as Record<string, unknown>[];

      if (objectItems.length > 0) {
        const allKeys = Array.from(new Set(objectItems.flatMap((item) => Object.keys(item))));
        const fields: string[] = [];

        for (const key of allKeys) {
          const isOptional = objectItems.some((item) => !(key in item));
          const safeKey = isSafeIdentifier(key) ? key : JSON.stringify(key);

          const innerTypes = Array.from(
            new Set(
              objectItems
                .filter((item) => key in item)
                .map((item) => generateZod(item[key]))
            )
          );

          let baseSchema =
            innerTypes.length === 1
              ? innerTypes[0]
              : `z.union([${innerTypes.join(', ')}])`;

          if (isOptional) {
            baseSchema = `${baseSchema}.optional()`;
          }

          fields.push(`  ${safeKey}: ${baseSchema},`);
        }

        return `z.array(z.object({\n${fields.join('\n')}\n}))`;
      }

      const types = Array.from(new Set(value.map((v) => generateZod(v))));
      if (types.length === 1) return `z.array(${types[0]})`;
      return `z.array(z.union([${types.join(', ')}]))`;
    }

    if (type === 'object') {
      const obj = value as Record<string, unknown>;
      const fields: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        const safeKey = isSafeIdentifier(key) ? key : JSON.stringify(key);
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
 * Generates JSON Schema (Draft 2020-12) from JSON with multi-element inspection
 */
export function jsonToJSONSchema(jsonString: string, title: string = 'GeneratedSchema'): string {
  const parsed = requireJSON(jsonString, 'Cannot generate JSON Schema');

  function buildSchema(val: unknown): Record<string, unknown> {
    if (val === null) return { type: 'null' };
    if (typeof val === 'string') return { type: 'string' };
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { type: 'integer' } : { type: 'number' };
    }
    if (typeof val === 'boolean') return { type: 'boolean' };

    if (Array.isArray(val)) {
      if (val.length === 0) return { type: 'array', items: {} };

      const objectItems = val.filter(
        (it) => typeof it === 'object' && it !== null && !Array.isArray(it)
      ) as Record<string, unknown>[];

      if (objectItems.length > 0) {
        const allKeys = Array.from(new Set(objectItems.flatMap((item) => Object.keys(item))));
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const key of allKeys) {
          const sample = objectItems.find((item) => key in item);
          if (sample) {
            properties[key] = buildSchema(sample[key]);
          }
          if (objectItems.every((item) => key in item)) {
            required.push(key);
          }
        }

        return {
          type: 'array',
          items: {
            type: 'object',
            properties,
            required,
            additionalProperties: true,
          },
        };
      }

      return {
        type: 'array',
        items: buildSchema(val[0]),
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
  const parsed = requireJSON(jsonString, 'Cannot generate Markdown Table');

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
