import type { TokenStats } from './types';
import { jsonToTOON, jsonToYAML } from './converters';
import { minifyJSON } from './formatter';

/**
 * Estimates token count based on modern BPE tokenization heuristics (cl100k / o200k approximation)
 * Splitting on words, numbers, punctuation, spaces, and brackets.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;

  const tokenRegex =
    /'s|'t|'re|'ve|'m|'ll|'d|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
  const matches = text.match(tokenRegex);

  if (!matches) {
    return Math.ceil(text.length / 3.7);
  }

  return matches.length;
}

/**
 * Computes comparative token statistics for standard JSON vs TOON vs YAML vs Minified JSON
 */
export function calculateTokenStats(jsonString: string): TokenStats {
  if (!jsonString || jsonString.trim() === '') {
    return {
      jsonTokens: 0,
      toonTokens: 0,
      yamlTokens: 0,
      minifiedTokens: 0,
      savedPercent: 0,
    };
  }

  const jsonTokens = estimateTokens(jsonString);

  let toonTokens = jsonTokens;
  try {
    const toonString = jsonToTOON(jsonString);
    toonTokens = estimateTokens(toonString);
  } catch {
    toonTokens = jsonTokens;
  }

  let yamlTokens = jsonTokens;
  try {
    const yamlString = jsonToYAML(jsonString);
    yamlTokens = estimateTokens(yamlString);
  } catch {
    yamlTokens = jsonTokens;
  }

  let minifiedTokens = jsonTokens;
  try {
    const minified = minifyJSON(jsonString);
    minifiedTokens = estimateTokens(minified);
  } catch {
    minifiedTokens = jsonTokens;
  }

  const savedPercent =
    jsonTokens > 0 ? Math.max(0, Math.round(((jsonTokens - toonTokens) / jsonTokens) * 100)) : 0;

  return {
    jsonTokens,
    toonTokens,
    yamlTokens,
    minifiedTokens,
    savedPercent,
  };
}
