import { jsonrepair } from 'jsonrepair';
import type { RepairResult } from './types';

/**
 * Robust AST-driven repair for malformed, dirty, or truncated JSON strings.
 * Handles LLM output artifacts, Python dict dumps, unquoted keys, single quotes,
 * comments, trailing commas, and unclosed brackets/braces using token-aware parsing.
 */
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

  // 1. Extract the first markdown code block (```json ... ```), even when the
  // LLM wrapped it in prose like "Here is the JSON:"
  const fence = text.match(/```[\w-]*[^\S\n]*\n?([\s\S]*?)(?:\n?```|$)/);
  if (fence) {
    text = fence[1].trim();
    fixes.push('Stripped markdown code block wrappers');
  }

  // 2. Normalize bare JS-only literals (undefined, NaN, Infinity) to null.
  // String literals are skipped, so "value is undefined" is left untouched.
  const normalized = replaceBareLiterals(text);
  if (normalized.replaced.length > 0) {
    text = normalized.text;
    for (const literal of normalized.replaced) {
      fixes.push(`Normalized "${literal}" to null`);
    }
  }

  try {
    // 3. Run industrial-grade AST-driven jsonrepair
    const repairedRaw = jsonrepair(text);

    // 4. Validate and format output
    const parsed = JSON.parse(repairedRaw);
    const formatted = JSON.stringify(parsed, null, 2);

    if (fixes.length === 0 && repairedRaw !== text) {
      fixes.push('Corrected JSON syntax');
    }

    return {
      success: true,
      repaired: formatted,
      fixes: fixes.length > 0 ? fixes : ['Validated clean JSON'],
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

const BARE_LITERALS = ['undefined', '-Infinity', 'Infinity', 'NaN'];

/**
 * Replaces bare JS literals that JSON cannot represent with `null`, skipping
 * anything inside single- or double-quoted string literals.
 */
function replaceBareLiterals(text: string): { text: string; replaced: string[] } {
  let out = '';
  const replaced = new Set<string>();
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"' || ch === "'") {
      // Copy the whole string literal verbatim, honouring backslash escapes
      let j = i + 1;
      while (j < text.length && text[j] !== ch) {
        j += text[j] === '\\' ? 2 : 1;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    const literal = BARE_LITERALS.find(
      (lit) =>
        text.startsWith(lit, i) &&
        !/[\w$]/.test(text[i - 1] ?? '') &&
        !/[\w$]/.test(text[i + lit.length] ?? '')
    );
    if (literal) {
      out += 'null';
      replaced.add(literal);
      i += literal.length;
      continue;
    }

    out += ch;
    i++;
  }

  return { text: out, replaced: [...replaced] };
}
