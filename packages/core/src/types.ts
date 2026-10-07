// Supported conversion formats
export type ConversionFormat = 'json' | 'xml' | 'csv' | 'yaml' | 'toml' | 'toon';

// Supported generator types
export type GeneratorType = 'typescript' | 'zod' | 'json-schema' | 'markdown-table';

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

// Token counting method: real o200k_base BPE, or the heuristic fallback
export type TokenizerName = 'o200k_base' | 'estimate';

// Token economy statistics
export interface TokenStats {
  /** Tokens for the input re-formatted as 2-space-indented JSON */
  jsonTokens: number;
  toonTokens: number;
  yamlTokens: number;
  minifiedTokens: number;
  /** TOON savings vs formatted JSON */
  savedPercent: number;
  /** TOON savings vs minified JSON (the stricter comparison) */
  savedVsMinifiedPercent: number;
  tokenizer: TokenizerName;
}

// Smart heuristic repair result
export interface RepairResult {
  success: boolean;
  repaired: string;
  fixes: string[];
  error?: string;
}

// Visual Tree AST Node representation
export type JSONValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface ASTNode {
  id: string;
  key?: string;
  type: JSONValueType;
  value?: string | number | boolean | null;
  children?: ASTNode[];
  isExpanded?: boolean;
}
