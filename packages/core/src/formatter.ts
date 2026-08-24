import type { IndentSize } from './types';
import { parseJSON } from './validator';

/**
 * Formats/beautifies JSON string with specified indentation
 */
export function formatJSON(jsonString: string, indentSize: IndentSize = 2): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot format');
  }

  return JSON.stringify(parsed, null, indentSize);
}

/**
 * Minifies JSON string by removing all whitespace
 */
export function minifyJSON(jsonString: string): string {
  const parsed = parseJSON(jsonString);
  if (parsed === null) {
    throw new Error('Invalid JSON: Cannot minify');
  }

  return JSON.stringify(parsed);
}

/**
 * Compacts JSON by removing unnecessary whitespace
 */
export function compactJSON(jsonString: string): string {
  return minifyJSON(jsonString);
}
