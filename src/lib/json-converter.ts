import { XMLBuilder } from 'fast-xml-parser';
import Papa from 'papaparse';
import yaml from 'js-yaml';
import * as TOML from '@iarna/toml';
import { encode as encodeTOON } from '@toon-format/toon';
import { parseJSON } from './json-validator';

/**
 * Converts JSON to XML format
 */
export function jsonToXML(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to XML');
  }

  const builder = new XMLBuilder({
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });

  // Wrap in root element if not already wrapped
  const data = typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed
    : { root: parsed };

  return builder.build(data);
}

/**
 * Converts JSON to CSV format
 * Works best with arrays of objects
 */
export function jsonToCSV(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to CSV');
  }

  // Handle arrays of objects
  if (Array.isArray(parsed)) {
    return Papa.unparse(parsed);
  }

  // Handle single object
  if (typeof parsed === 'object' && parsed !== null) {
    return Papa.unparse([parsed]);
  }

  // Handle primitive values
  throw new Error('JSON must be an object or array to convert to CSV');
}

/**
 * Converts JSON to YAML format
 */
export function jsonToYAML(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to YAML');
  }

  return yaml.dump(parsed, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

/**
 * Converts JSON to TOML format
 */
export function jsonToTOML(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to TOML');
  }

  // TOML requires top-level to be an object (not an array or primitive)
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('TOML requires a top-level object. Wrap arrays/primitives in an object first.');
  }

  return TOML.stringify(parsed);
}

/**
 * Converts JSON to TOON format (Token-Oriented Object Notation)
 * TOON is a compact, LLM-friendly format that minimizes tokens
 */
export function jsonToTOON(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to TOON');
  }

  return encodeTOON(parsed);
}
