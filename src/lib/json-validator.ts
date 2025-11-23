import type { ValidationResult } from '../types/index.js';

/**
 * Validates JSON string and returns validation result
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
      // Try to extract line and column from error message
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : undefined;

      let line: number | undefined;
      let column: number | undefined;

      if (position !== undefined) {
        const lines = jsonString.substring(0, position).split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }

      return {
        isValid: false,
        error: {
          message: error.message,
          line,
          column,
        },
      };
    }

    return {
      isValid: false,
      error: {
        message: 'Unknown parsing error',
      },
    };
  }
}

/**
 * Attempts to parse JSON string, returns parsed object or null
 */
export function parseJSON(jsonString: string): any | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}
