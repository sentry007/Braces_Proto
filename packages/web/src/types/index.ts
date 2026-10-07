// Re-export the core types used by the web app
export type {
  ConversionFormat,
  GeneratorType,
  IndentSize,
  ValidationResult,
  TokenStats,
  RepairResult,
  JSONValueType,
} from 'bracer';

import type { ConversionFormat, GeneratorType } from 'bracer';

// Web editor UI modes
export type InputEditorMode = 'code' | 'tree' | 'form' | 'text';
export type OutputEditorMode = 'code' | 'preview' | 'diff';

// Active output target
export type OutputTarget =
  | { kind: 'format'; format: ConversionFormat }
  | { kind: 'generator'; generator: GeneratorType };

// File upload result
export interface FileUploadResult {
  success: boolean;
  content?: string;
  format?: ConversionFormat;
  error?: string;
}
