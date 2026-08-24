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

// Token economy statistics
export interface TokenStats {
  jsonTokens: number;
  toonTokens: number;
  yamlTokens: number;
  minifiedTokens: number;
  savedPercent: number;
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
