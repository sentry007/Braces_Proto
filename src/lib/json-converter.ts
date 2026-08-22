import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import Papa from 'papaparse';
import yaml from 'js-yaml';
import * as TOML from '@iarna/toml';
import { encode as encodeTOON, decode as decodeTOON } from '@toon-format/toon';
import { parseJSON } from './json-validator';
import type { ConversionFormat } from '../types/index.js';

/**
 * Converts JSON string to XML format
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
    ignoreAttributes: false,
  });

  const data = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? parsed
    : { root: parsed };

  return builder.build(data);
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
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  const parsed = parser.parse(xmlString);
  return JSON.stringify(parsed, null, indent);
}

/**
 * Converts JSON to CSV format
 */
export function jsonToCSV(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to CSV');
  }

  if (Array.isArray(parsed)) {
    return Papa.unparse(parsed);
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Papa.unparse([parsed]);
  }

  throw new Error('JSON must be an object or array to convert to CSV');
}

/**
 * Converts CSV string to formatted JSON
 */
export function csvToJSON(csvString: string, indent: number = 2): string {
  if (!csvString || csvString.trim() === '') {
    throw new Error('Empty CSV input');
  }

  const results = Papa.parse(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (results.errors && results.errors.length > 0 && results.data.length === 0) {
    throw new Error(results.errors[0].message);
  }

  return JSON.stringify(results.data, null, indent);
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
 * Converts YAML string to formatted JSON
 */
export function yamlToJSON(yamlString: string, indent: number = 2): string {
  if (!yamlString || yamlString.trim() === '') {
    throw new Error('Empty YAML input');
  }

  const parsed = yaml.load(yamlString);
  return JSON.stringify(parsed, null, indent);
}

/**
 * Converts JSON to TOML format
 */
export function jsonToTOML(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to TOML');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('TOML requires a top-level object. Wrap arrays or primitive values in an object first.');
  }

  return TOML.stringify(parsed as unknown as TOML.JsonMap);
}

/**
 * Converts TOML string to formatted JSON
 */
export function tomlToJSON(tomlString: string, indent: number = 2): string {
  if (!tomlString || tomlString.trim() === '') {
    throw new Error('Empty TOML input');
  }

  const parsed = TOML.parse(tomlString);
  return JSON.stringify(parsed, null, indent);
}

/**
 * Converts JSON to TOON format (Token-Oriented Object Notation)
 */
export function jsonToTOON(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot convert to TOON');
  }

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
