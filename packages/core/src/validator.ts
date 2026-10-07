import type { ValidationResult } from './types';

/**
 * Validates JSON string and returns detailed validation result with line/col positions
 */
export function validateJSON(jsonString: string): ValidationResult {
  if (!jsonString || jsonString.trim() === '') {
    return {
      isValid: false,
      error: {
        message: 'Input is empty',
      },
    };
  }

  try {
    JSON.parse(jsonString);
    return { isValid: true };
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Try to extract position from standard error messages
      const match = error.message.match(/position (\d+)/i) || error.message.match(/at line (\d+) column (\d+)/i);

      let line: number | undefined;
      let column: number | undefined;

      if (match) {
        if (match[2]) {
          line = parseInt(match[1], 10);
          column = parseInt(match[2], 10);
        } else if (match[1]) {
          const position = parseInt(match[1], 10);
          const lines = jsonString.substring(0, position).split('\n');
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
        }
      }

      return {
        isValid: false,
        error: {
          message: error.message.replace(/^JSON\.parse:\s*/i, ''),
          line,
          column,
        },
      };
    }

    return {
      isValid: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown parsing error',
      },
    };
  }
}

/**
 * Parses a JSON string without throwing. Unlike `parseJSON`, this distinguishes
 * valid `null` input from a parse failure.
 */
export function tryParseJSON(
  jsonString: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(jsonString) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Parses a JSON string, throwing a descriptive error if it is invalid.
 * `context` names the operation for the error message (e.g. "Cannot convert to YAML").
 */
export function requireJSON(jsonString: string, context: string): unknown {
  const result = tryParseJSON(jsonString);
  if (!result.ok) {
    throw new Error(`Invalid JSON: ${context}. ${result.error}`);
  }
  return result.value;
}

/**
 * Attempts to parse JSON string, returns parsed object or null.
 * Note: valid `null` input also returns null; use `tryParseJSON` to tell them apart.
 */
export function parseJSON(jsonString: string): unknown | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}
