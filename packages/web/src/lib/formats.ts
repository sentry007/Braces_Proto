import { convertContent, estimateTokens, formatJSON } from 'bracer';
import type { ConversionFormat, GeneratorType, OutputTarget } from '../types';

interface TargetInfo {
  label: string;
  /** Monaco language id used to highlight this content */
  language: string;
  ext: string;
  mime: string;
}

export const FORMATS: (TargetInfo & { id: ConversionFormat })[] = [
  { id: 'json', label: 'JSON', language: 'json', ext: 'json', mime: 'application/json' },
  { id: 'toon', label: 'TOON', language: 'toon', ext: 'toon', mime: 'text/plain' },
  { id: 'yaml', label: 'YAML', language: 'yaml', ext: 'yaml', mime: 'application/yaml' },
  { id: 'toml', label: 'TOML', language: 'ini', ext: 'toml', mime: 'application/toml' },
  { id: 'csv', label: 'CSV', language: 'plaintext', ext: 'csv', mime: 'text/csv' },
  { id: 'xml', label: 'XML', language: 'xml', ext: 'xml', mime: 'application/xml' },
];

export const GENERATORS: (TargetInfo & { id: GeneratorType })[] = [
  { id: 'typescript', label: 'TypeScript types', language: 'typescript', ext: 'ts', mime: 'text/plain' },
  { id: 'zod', label: 'Zod schema', language: 'typescript', ext: 'ts', mime: 'text/plain' },
  { id: 'json-schema', label: 'JSON Schema', language: 'json', ext: 'schema.json', mime: 'application/json' },
  { id: 'markdown-table', label: 'Markdown table', language: 'markdown', ext: 'md', mime: 'text/markdown' },
];

export function formatInfo(format: ConversionFormat): TargetInfo {
  return FORMATS.find((f) => f.id === format)!;
}

export function targetInfo(target: OutputTarget): TargetInfo {
  return target.kind === 'format'
    ? formatInfo(target.format)
    : GENERATORS.find((g) => g.id === target.generator)!;
}

/** Short label for badges: the format name, or the generator's first word. */
export function targetBadge(target: OutputTarget): string {
  if (target.kind === 'format') return formatInfo(target.format).label;
  return { typescript: 'TS', zod: 'Zod', 'json-schema': 'Schema', 'markdown-table': 'Markdown' }[target.generator];
}

/** Token count of the input in every output format; null where conversion fails. */
export function formatTokenCounts(json: string): Partial<Record<ConversionFormat, number | null>> {
  const counts: Partial<Record<ConversionFormat, number | null>> = {};
  for (const { id } of FORMATS) {
    try {
      counts[id] = estimateTokens(id === 'json' ? formatJSON(json, 2) : convertContent(json, 'json', id));
    } catch {
      counts[id] = null;
    }
  }
  return counts;
}

/** Strips parser position details we already show separately as line/column. */
export function cleanErrorMessage(message: string): string {
  return message
    .replace(/\s*\(line \d+ column \d+\)/i, '')
    .replace(/\s*in JSON at position \d+/i, '')
    .replace(/^Unexpected token/, 'Unexpected character');
}

export function formatBytes(chars: number): string {
  if (chars < 1024) return `${chars} B`;
  if (chars < 1024 * 1024) return `${(chars / 1024).toFixed(1)} KB`;
  return `${(chars / 1024 / 1024).toFixed(1)} MB`;
}
