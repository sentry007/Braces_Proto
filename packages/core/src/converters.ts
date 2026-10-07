import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import Papa from 'papaparse';
import yaml from 'js-yaml';
import { parse as parseTOML, stringify as stringifyTOML } from 'smol-toml';
import { encode as encodeTOON, decode as decodeTOON } from '@toon-format/toon';
import { requireJSON } from './validator';
import type { ConversionFormat } from './types';

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// XML
// ---------------------------------------------------------------------------

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';

/**
 * Makes an object key safe to use as an XML element name.
 * Attribute keys (`@_name`) and text nodes (`#text`) are preserved.
 */
function toXMLName(key: string): string {
  if (key === '#text') return key;
  if (key.startsWith('@_')) return `@_${toXMLName(key.slice(2))}`;
  let name = key.replace(/[^\w.-]/g, '_');
  if (!/^[A-Za-z_]/.test(name) || /^xml/i.test(name)) name = `_${name}`;
  return name;
}

function sanitizeXMLKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeXMLKeys);
  if (isPlainObject(value)) {
    const out: PlainObject = {};
    for (const [key, child] of Object.entries(value)) {
      out[toXMLName(key)] = sanitizeXMLKeys(child);
    }
    return out;
  }
  return value;
}

/**
 * Converts JSON string to a well-formed XML document.
 * Output always has exactly one root element: a single-key object whose value
 * is an object becomes the root itself, anything else is wrapped in `<root>`.
 */
export function jsonToXML(jsonString: string): string {
  const parsed = requireJSON(jsonString, 'Cannot convert to XML');

  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
    ignoreAttributes: false,
  });

  const keys = isPlainObject(parsed) ? Object.keys(parsed) : [];
  const hasSingleRoot = keys.length === 1 && isPlainObject((parsed as PlainObject)[keys[0]]);
  const data = sanitizeXMLKeys(hasSingleRoot ? parsed : { root: parsed });

  return XML_DECLARATION + builder.build(data);
}

/**
 * Converts XML string to formatted JSON
 */
export function xmlToJSON(xmlString: string, indent: number = 2): string {
  if (!xmlString || xmlString.trim() === '') {
    throw new Error('Empty XML input');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    ignoreDeclaration: true,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    // Keep values like ZIP codes ("007") and hex-looking IDs as strings
    numberParseOptions: { leadingZeros: false, hex: false },
  });

  const parsed = parser.parse(xmlString);
  return JSON.stringify(parsed, null, indent);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Flattens nested objects into dot-path keys (`{a:{b:1}}` -> `{"a.b":1}`).
 * Arrays are kept as JSON text in a single cell.
 */
function flattenRow(value: PlainObject, prefix = '', out: PlainObject = {}): PlainObject {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(child) && Object.keys(child).length > 0) {
      flattenRow(child, path, out);
    } else if (Array.isArray(child) || isPlainObject(child)) {
      out[path] = JSON.stringify(child);
    } else {
      out[path] = child;
    }
  }
  return out;
}

/**
 * Converts JSON to CSV format. Columns are the union of keys across all rows
 * (in first-seen order), and nested objects are flattened to dot paths.
 */
export function jsonToCSV(jsonString: string): string {
  const parsed = requireJSON(jsonString, 'Cannot convert to CSV');

  let rows: unknown[];
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (isPlainObject(parsed)) {
    rows = [parsed];
  } else {
    throw new Error('JSON must be an object or array to convert to CSV');
  }

  const flatRows = rows.map((row) => (isPlainObject(row) ? flattenRow(row) : { value: row }));

  const fields: string[] = [];
  const seen = new Set<string>();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        fields.push(key);
      }
    }
  }

  return Papa.unparse({
    fields,
    data: flatRows.map((row) => fields.map((field) => row[field] ?? '')),
  });
}

const CSV_NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

/**
 * Types a CSV cell conservatively: numbers, booleans and empty cells are
 * converted, but values like "007" or very large IDs stay strings.
 */
function typeCSVCell(cell: string): unknown {
  const trimmed = cell.trim();
  if (trimmed === '') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (CSV_NUMBER.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num) && (!Number.isInteger(num) || Number.isSafeInteger(num))) {
      return num;
    }
  }
  return cell;
}

/**
 * Converts CSV string to formatted JSON
 */
export function csvToJSON(csvString: string, indent: number = 2): string {
  if (!csvString || csvString.trim() === '') {
    throw new Error('Empty CSV input');
  }

  const results = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  if (results.errors.length > 0 && results.data.length === 0) {
    throw new Error(results.errors[0].message);
  }

  const data = results.data.map((row) => {
    const typed: PlainObject = {};
    for (const [key, cell] of Object.entries(row)) {
      typed[key] = typeof cell === 'string' ? typeCSVCell(cell) : cell;
    }
    return typed;
  });

  return JSON.stringify(data, null, indent);
}

// ---------------------------------------------------------------------------
// YAML
// ---------------------------------------------------------------------------

/**
 * Converts JSON to YAML format
 */
export function jsonToYAML(jsonString: string): string {
  const parsed = requireJSON(jsonString, 'Cannot convert to YAML');

  return yaml.dump(parsed, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

/**
 * Converts YAML string to formatted JSON
 */
export function yamlToJSON(yamlString: string, indent: number = 2): string {
  if (!yamlString || yamlString.trim() === '') {
    throw new Error('Empty YAML input');
  }

  const parsed = yaml.load(yamlString);
  return JSON.stringify(parsed, null, indent);
}

// ---------------------------------------------------------------------------
// TOML
// ---------------------------------------------------------------------------

/**
 * TOML has no null type, and the serializer would silently drop null values.
 * Fail loudly instead, naming the first offending path.
 */
function findNullPath(value: unknown, path: string): string | null {
  if (value === null) return path || '(root)';
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findNullPath(value[i], `${path}[${i}]`);
      if (found) return found;
    }
  } else if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const found = findNullPath(child, path ? `${path}.${key}` : key);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Converts JSON to TOML format
 */
export function jsonToTOML(jsonString: string): string {
  const parsed = requireJSON(jsonString, 'Cannot convert to TOML');

  if (!isPlainObject(parsed)) {
    throw new Error('TOML requires a top-level object. Wrap arrays or primitive values in an object first.');
  }

  const nullPath = findNullPath(parsed, '');
  if (nullPath) {
    throw new Error(`TOML has no null type: remove or replace the null at "${nullPath}".`);
  }

  return stringifyTOML(parsed);
}

/**
 * Converts TOML string to formatted JSON
 */
export function tomlToJSON(tomlString: string, indent: number = 2): string {
  if (!tomlString || tomlString.trim() === '') {
    throw new Error('Empty TOML input');
  }

  const parsed = parseTOML(tomlString);
  return JSON.stringify(parsed, null, indent);
}

// ---------------------------------------------------------------------------
// TOON
// ---------------------------------------------------------------------------

/**
 * Converts JSON to TOON format (Token-Oriented Object Notation)
 */
export function jsonToTOON(jsonString: string): string {
  const parsed = requireJSON(jsonString, 'Cannot convert to TOON');
  return encodeTOON(parsed);
}

/**
 * Converts TOON string to formatted JSON
 */
export function toonToJSON(toonString: string, indent: number = 2): string {
  if (!toonString || toonString.trim() === '') {
    throw new Error('Empty TOON input');
  }

  try {
    const parsed = decodeTOON(toonString);
    return JSON.stringify(parsed, null, indent);
  } catch (err) {
    throw new Error(`Failed to parse TOON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Universal Bidirectional Conversion Dispatcher
 */
export function convertContent(
  content: string,
  fromFormat: ConversionFormat,
  toFormat: ConversionFormat,
  indent: number = 2
): string {
  if (!content || content.trim() === '') {
    return '';
  }

  if (fromFormat === toFormat) {
    return content;
  }

  // Step 1: Normalize input to standard JSON string
  let jsonString: string;
  switch (fromFormat) {
    case 'json':
      jsonString = content;
      break;
    case 'xml':
      jsonString = xmlToJSON(content, indent);
      break;
    case 'csv':
      jsonString = csvToJSON(content, indent);
      break;
    case 'yaml':
      jsonString = yamlToJSON(content, indent);
      break;
    case 'toml':
      jsonString = tomlToJSON(content, indent);
      break;
    case 'toon':
      jsonString = toonToJSON(content, indent);
      break;
    default:
      throw new Error(`Unsupported source format: ${fromFormat}`);
  }

  // Step 2: Convert JSON string to target format
  switch (toFormat) {
    case 'json':
      return jsonString;
    case 'xml':
      return jsonToXML(jsonString);
    case 'csv':
      return jsonToCSV(jsonString);
    case 'yaml':
      return jsonToYAML(jsonString);
    case 'toml':
      return jsonToTOML(jsonString);
    case 'toon':
      return jsonToTOON(jsonString);
    default:
      throw new Error(`Unsupported target format: ${toFormat}`);
  }
}
