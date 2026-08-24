// Re-export all core types from @braces/core
export type {
  ConversionFormat,
  GeneratorType,
  IndentSize,
  ValidationResult,
  TokenStats,
  RepairResult,
  JSONValueType,
  ASTNode,
} from '@braces/core';

import type { ConversionFormat, GeneratorType, IndentSize, TokenStats } from '@braces/core';

// Web Editor UI modes
export type InputEditorMode = 'code' | 'tree' | 'form' | 'text';
export type OutputEditorMode = 'code' | 'preview' | 'diff' | 'text';
export type EditorMode = InputEditorMode | OutputEditorMode;

// Active Output Target
export type OutputTarget =
  | { kind: 'format'; format: ConversionFormat }
  | { kind: 'generator'; generator: GeneratorType };

// Editor state
export interface EditorState {
  inputContent: string;
  outputContent: string;
  inputMode: InputEditorMode;
  outputMode: OutputEditorMode;
  inputFormat: ConversionFormat;
  outputTarget: OutputTarget;
  indentSize: IndentSize;
  isDarkMode: boolean;
  isLoading: boolean;
  error: string | null;
  tokenStats: TokenStats;
  schemaContent: string;
  isAutoSync: boolean;
}

// File upload result
export interface FileUploadResult {
  success: boolean;
  content?: string;
  error?: string;
}
