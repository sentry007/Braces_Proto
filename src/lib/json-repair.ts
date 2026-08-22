/**
 * Smart heuristic repair for malformed, dirty, or truncated JSON strings
 * Commonly handles outputs from LLMs, Python dict dumps, and developer copy-pastes.
 */

export interface RepairResult {
  success: boolean;
  repaired: string;
  fixes: string[];
  error?: string;
}

export function repairJSON(input: string): RepairResult {
  if (!input || input.trim() === '') {
    return {
      success: false,
      repaired: '',
      fixes: [],
      error: 'Input is empty',
    };
  }

  let text = input.trim();
  const fixes: string[] = [];

  // 1. Strip markdown code block wrappers ```json ... ``` or ``` ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    fixes.push('Stripped markdown code block wrappers');
  }

  // 2. Normalize Python / JS literals
  if (/\bNone\b/.test(text)) {
    text = text.replace(/\bNone\b/g, 'null');
    fixes.push('Converted Python "None" to "null"');
  }
  if (/\bTrue\b/.test(text)) {
    text = text.replace(/\bTrue\b/g, 'true');
    fixes.push('Converted Python "True" to "true"');
  }
  if (/\bFalse\b/.test(text)) {
    text = text.replace(/\bFalse\b/g, 'false');
    fixes.push('Converted Python "False" to "false"');
  }
  if (/\bundefined\b/.test(text)) {
    text = text.replace(/\bundefined\b/g, 'null');
    fixes.push('Converted JavaScript "undefined" to "null"');
  }
  if (/\bNaN\b/.test(text)) {
    text = text.replace(/\bNaN\b/g, 'null');
    fixes.push('Converted "NaN" to "null"');
  }

  // 3. Remove single-line and multi-line comments (JSONC to JSON)
  if (/\/\/.*|\/\*[\s\S]*?\*\//.test(text)) {
    text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    fixes.push('Removed JavaScript comments');
  }

  // 4. Convert single-quoted strings & keys to double quotes while respecting escaped quotes
  // We match single quotes that look like keys or values
  if (/'/.test(text)) {
    // Replace single quotes around keys: 'key': -> "key":
    text = text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g, '"$1":');
    // Replace single quotes around string values: : 'value' -> : "value"
    text = text.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ': "$1"');
    // Replace single quotes in arrays: ['a', 'b'] -> ["a", "b"]
    text = text.replace(/\[\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, '["$1"');
    text = text.replace(/,\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ', "$1"');
    fixes.push('Converted single quotes to double quotes');
  }

  // 5. Quote unquoted object keys: { name: "value" } -> { "name": "value" }
  const unquotedKeyRegex = /([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g;
  if (unquotedKeyRegex.test(text)) {
    text = text.replace(unquotedKeyRegex, '$1"$2":');
    fixes.push('Added double quotes around unquoted object keys');
  }

  // 6. Remove trailing commas before } or ]
  if (/,\s*([}\]])/.test(text)) {
    text = text.replace(/,\s*([}\]])/g, '$1');
    fixes.push('Removed trailing commas');
  }

  // 7. Balance unmatched brackets / braces (for truncated streams/payloads)
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces = Math.max(0, openBraces - 1);
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  if (inString) {
    text += '"';
    fixes.push('Closed unclosed string quotation');
  }

  if (openBrackets > 0) {
    text += ']'.repeat(openBrackets);
    fixes.push(`Closed ${openBrackets} unclosed square bracket(s)`);
  }

  if (openBraces > 0) {
    text += '}'.repeat(openBraces);
    fixes.push(`Closed ${openBraces} unclosed curly brace(s)`);
  }

  // 8. Test if the result parses as valid JSON
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    return {
      success: true,
      repaired: formatted,
      fixes: fixes.length > 0 ? fixes : ['Formatted clean JSON'],
    };
  } catch (err) {
    return {
      success: false,
      repaired: text,
      fixes,
      error: err instanceof Error ? err.message : 'Could not automatically resolve all syntax errors',
    };
  }
}
