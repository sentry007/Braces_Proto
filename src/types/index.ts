// Editor modes
export type InputEditorMode = 'code' | 'tree' | 'form' | 'text';
export type OutputEditorMode = 'code' | 'preview' | 'diff' | 'text';
export type EditorMode = InputEditorMode | OutputEditorMode;

// Conversion formats
export type ConversionFormat = 'json' | 'xml' | 'csv' | 'yaml' | 'toml' | 'toon';

// Generator types
export type GeneratorType = 'typescript' | 'zod' | 'json-schema' | 'markdown-table';

// Active Output Target
export type OutputTarget =
  | { kind: 'format'; format: ConversionFormat }
  | { kind: 'generator'; generator: GeneratorType };

// Indentation options
export type IndentSize = 2 | 3 | 4;

// Validation result
export interface ValidationResult {
  isValid: boolean;
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
}

// Token economy statistics
export interface TokenStats {
  jsonTokens: number;
  toonTokens: number;
  yamlTokens: number;
  minifiedTokens: number;
  savedPercent: number;
}

// Visual Tree AST Node representation for Drag & Drop editing
export type JSONValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface ASTNode {
  id: string;
  key?: string;
  type: JSONValueType;
  value?: string | number | boolean | null;
  children?: ASTNode[];
  isExpanded?: boolean;
}

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
