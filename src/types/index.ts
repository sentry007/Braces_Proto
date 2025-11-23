// Editor modes
export type EditorMode = 'code' | 'tree' | 'form' | 'text' | 'view' | 'preview';

// Conversion formats
export type ConversionFormat = 'xml' | 'csv' | 'yaml';

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

// Editor state
export interface EditorState {
  inputContent: string;
  outputContent: string;
  inputMode: EditorMode;
  outputMode: EditorMode;
  indentSize: IndentSize;
  isDarkMode: boolean;
  isLoading: boolean;
}

// File upload result
export interface FileUploadResult {
  success: boolean;
  content?: string;
  error?: string;
}
