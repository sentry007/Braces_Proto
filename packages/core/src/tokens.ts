import { Tiktoken } from 'js-tiktoken/lite';
import type { TokenStats, TokenizerName } from './types';
import { jsonToTOON, jsonToYAML } from './converters';
import { formatJSON, minifyJSON } from './formatter';

let encoder: Tiktoken | null = null;
let loading: Promise<boolean> | null = null;

/**
 * Loads the o200k_base BPE tokenizer (used by GPT-4o / GPT-4.1 / o-series models).
 * The rank table is ~2 MB, so it is loaded on demand. Until it resolves,
 * `estimateTokens` falls back to a heuristic. Resolves to false if loading fails.
 */
export function loadTokenizer(): Promise<boolean> {
  if (encoder) return Promise.resolve(true);
  loading ??= import('js-tiktoken/ranks/o200k_base')
    .then((mod) => {
      encoder = new Tiktoken(mod.default);
      return true;
    })
    .catch(() => {
      loading = null;
      return false;
    });
  return loading;
}

/**
 * Which counting method `estimateTokens` is currently using.
 */
export function getTokenizerName(): TokenizerName {
  return encoder ? 'o200k_base' : 'estimate';
}

const CHUNK_REGEX =
  /'s|'t|'re|'ve|'m|'ll|'d|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
const CJK_CHAR = /[⺀-鿿가-힯豈-﫿぀-ヿ]/gu;

/**
 * Heuristic fallback: splits with the cl100k pre-tokenizer pattern, then
 * charges long chunks ~1 token per 5 chars and CJK text ~1 token per char.
 */
function heuristicTokens(text: string): number {
  const chunks = text.match(CHUNK_REGEX) ?? [];
  let count = 0;
  for (const chunk of chunks) {
    const cjk = chunk.match(CJK_CHAR)?.length ?? 0;
    const rest = chunk.length - cjk;
    count += cjk + (rest > 0 ? Math.max(1, Math.ceil(rest / 5)) : 0);
  }
  return count;
}

/**
 * Counts tokens with the o200k_base tokenizer once `loadTokenizer()` has
 * resolved, otherwise returns a heuristic estimate.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  if (encoder) {
    // Treat special-token text like <|endoftext|> as plain text instead of throwing
    return encoder.encode(text, [], []).length;
  }
  return heuristicTokens(text);
}

function percentSaved(baseline: number, value: number): number {
  return baseline > 0 ? Math.max(0, Math.round(((baseline - value) / baseline) * 100)) : 0;
}

/**
 * Computes comparative token statistics for formatted JSON vs TOON vs YAML vs
 * minified JSON. The baseline is the input re-formatted with 2-space indent,
 * so the result does not depend on how the input happened to be formatted.
 */
export function calculateTokenStats(jsonString: string): TokenStats {
  const tokenizer = getTokenizerName();
  if (!jsonString || jsonString.trim() === '') {
    return {
      jsonTokens: 0,
      toonTokens: 0,
      yamlTokens: 0,
      minifiedTokens: 0,
      savedPercent: 0,
      savedVsMinifiedPercent: 0,
      tokenizer,
    };
  }

  let formatted = jsonString;
  try {
    formatted = formatJSON(jsonString, 2);
  } catch {
    // Invalid JSON: count it as-is; the other formats fall back to the same count
  }
  const jsonTokens = estimateTokens(formatted);

  const countOr = (convert: () => string): number => {
    try {
      return estimateTokens(convert());
    } catch {
      return jsonTokens;
    }
  };

  const toonTokens = countOr(() => jsonToTOON(jsonString));
  const yamlTokens = countOr(() => jsonToYAML(jsonString));
  const minifiedTokens = countOr(() => minifyJSON(jsonString));

  return {
    jsonTokens,
    toonTokens,
    yamlTokens,
    minifiedTokens,
    savedPercent: percentSaved(jsonTokens, toonTokens),
    savedVsMinifiedPercent: percentSaved(minifiedTokens, toonTokens),
    tokenizer,
  };
}
