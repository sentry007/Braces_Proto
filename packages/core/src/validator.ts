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
 * Attempts to parse JSON string, returns parsed object or null
 */
export function parseJSON(jsonString: string): unknown | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}
