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

  // 1. Strip markdown code block wrappers ```json ... ``` or ``` ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    fixes.push('Stripped markdown code block wrappers');
  }

  // 2. Normalize bare JS-specific literals that are not JSON or Python constants
  // (e.g. bare undefined -> null, NaN -> null)
  if (/\bundefined\b/.test(text)) {
    // Only replace bare undefined outside quotes
    text = text.replace(/(?<=[:\[,\s])undefined(?=[,\s\]\}]|$)/g, 'null');
    fixes.push('Normalized "undefined" to null');
  }
  if (/\bNaN\b/.test(text)) {
    text = text.replace(/(?<=[:\[,\s])NaN(?=[,\s\]\}]|$)/g, 'null');
    fixes.push('Normalized "NaN" to null');
  }

  try {
    // 3. Run industrial-grade AST-driven jsonrepair
    const repairedRaw = jsonrepair(text);

    // 4. Validate and format output
    const parsed = JSON.parse(repairedRaw);
    const formatted = JSON.stringify(parsed, null, 2);

    if (fixes.length === 0 && formatted !== input.trim()) {
      fixes.push('Corrected JSON syntax & formatting');
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
