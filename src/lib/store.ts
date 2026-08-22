import { create } from 'zustand';
import type {
  InputEditorMode,
  OutputEditorMode,
  IndentSize,
  ConversionFormat,
  OutputTarget,
  TokenStats,
} from '../types/index.js';
import { calculateTokenStats } from './token-counter';
import { repairJSON } from './json-repair';
import { convertContent } from './json-converter';
import { formatJSON } from './json-formatter';
import { jsonToTypeScript, jsonToZod, jsonToJSONSchema, jsonToMarkdownTable } from './schema-generator';

const sampleJSON = `{
  "name": "Braces Reborn",
  "version": "2.1.0",
  "tagline": "The Modern JSON & Data Transformation Suite",
  "features": [
    "Interactive Visual Tree Editor with Drag & Drop",
    "Bidirectional Polyglot Engine (XML, YAML, CSV, TOML, TOON)",
    "AI Token Optimizer & Token Counter",
    "TypeScript, Zod & JSON Schema Generator",
    "100% Client-Side Local Auto-Repair (Zero Server Telemetry)"
  ],
  "llm_token_savings": {
    "format": "TOON",
    "typical_reduction": "30% - 60%",
    "active": true
  },
  "stats": {
    "github_stars": 1420,
    "active_users": 8500,
    "supported_formats": 6
  }
}`;

function transformInput(
  input: string,
  inputFormat: ConversionFormat,
  target: OutputTarget,
  indent: number
): string {
  if (!input || input.trim() === '') return '';
  try {
    if (target.kind === 'format') {
      if (inputFormat === 'json' && target.format === 'json') {
        return formatJSON(input, indent as IndentSize);
      }
      return convertContent(input, inputFormat, target.format, indent);
    } else {
      switch (target.generator) {
        case 'typescript':
          return jsonToTypeScript(input);
        case 'zod':
          return jsonToZod(input);
        case 'json-schema':
          return jsonToJSONSchema(input);
        case 'markdown-table':
          return jsonToMarkdownTable(input);
      }
    }
  } catch {
    return '';
  }
}

interface EditorStore {
  // Content
  inputContent: string;
  outputContent: string;

  // Editor modes & targets
  inputMode: InputEditorMode;
  outputMode: OutputEditorMode;
  inputFormat: ConversionFormat;
  outputTarget: OutputTarget;

  // Settings
  indentSize: IndentSize;
  isDarkMode: boolean;
  isAutoSync: boolean;
  schemaContent: string;

  // UI & Stats
  isLoading: boolean;
  error: string | null;
  tokenStats: TokenStats;

  // Actions
  setInputContent: (content: string) => void;
  setOutputContent: (content: string) => void;
  setInputMode: (mode: InputEditorMode) => void;
  setOutputMode: (mode: OutputEditorMode) => void;
  setInputFormat: (format: ConversionFormat) => void;
  setOutputTarget: (target: OutputTarget) => void;
  setIndentSize: (size: IndentSize) => void;
  toggleDarkMode: () => void;
  toggleAutoSync: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
  loadSample: () => void;
  repairInput: () => { success: boolean; fixes: string[] };
}

const initialTarget: OutputTarget = { kind: 'format', format: 'json' };
const initialOutput = transformInput(sampleJSON, 'json', initialTarget, 2);

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  inputContent: sampleJSON,
  outputContent: initialOutput,
  inputMode: 'code',
  outputMode: 'code',
  inputFormat: 'json',
  outputTarget: initialTarget,
  indentSize: 2,
  isDarkMode: true,
  isAutoSync: true,
  schemaContent: '',
  isLoading: false,
  error: null,
  tokenStats: calculateTokenStats(sampleJSON),

  // Actions
  setInputContent: (content) => {
    const { inputFormat, outputTarget, indentSize, isAutoSync } = get();
    const stats = calculateTokenStats(content);

    let nextOutput = get().outputContent;
    if (isAutoSync) {
      const live = transformInput(content, inputFormat, outputTarget, indentSize);
      if (live || content.trim() === '') {
        nextOutput = live;
      }
    }

    set({
      inputContent: content,
      outputContent: nextOutput,
      tokenStats: stats,
    });
  },

  setOutputContent: (content) => set({ outputContent: content }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setOutputMode: (mode) => set({ outputMode: mode }),

  setInputFormat: (format) => {
    const { inputContent, outputTarget, indentSize, isAutoSync } = get();
    const nextOutput = isAutoSync
      ? transformInput(inputContent, format, outputTarget, indentSize)
      : get().outputContent;

    set({
      inputFormat: format,
      outputContent: nextOutput || get().outputContent,
    });
  },

  setOutputTarget: (target) => {
    const { inputContent, inputFormat, indentSize } = get();
    const nextOutput = transformInput(inputContent, inputFormat, target, indentSize);

    set({
      outputTarget: target,
      outputContent: nextOutput || get().outputContent,
    });
  },

  setIndentSize: (size) => {
    const { inputContent, inputFormat, outputTarget, isAutoSync } = get();
    const nextOutput = isAutoSync
      ? transformInput(inputContent, inputFormat, outputTarget, size)
      : get().outputContent;

    set({
      indentSize: size,
      outputContent: nextOutput || get().outputContent,
    });
  },

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  toggleAutoSync: () => set((state) => ({ isAutoSync: !state.isAutoSync })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  clearAll: () =>
    set({
      inputContent: '',
      outputContent: '',
      error: null,
      tokenStats: {
        jsonTokens: 0,
        toonTokens: 0,
        yamlTokens: 0,
        minifiedTokens: 0,
        savedPercent: 0,
      },
    }),

  loadSample: () => {
    const { outputTarget, indentSize } = get();
    const stats = calculateTokenStats(sampleJSON);
    const nextOutput = transformInput(sampleJSON, 'json', outputTarget, indentSize);

    set({
      inputContent: sampleJSON,
      outputContent: nextOutput,
      inputFormat: 'json',
      error: null,
      tokenStats: stats,
    });
  },

  repairInput: () => {
    const { inputContent, inputFormat, outputTarget, indentSize } = get();
    const result = repairJSON(inputContent);
    if (result.success && result.repaired) {
      const stats = calculateTokenStats(result.repaired);
      const nextOutput = transformInput(result.repaired, inputFormat, outputTarget, indentSize);
      set({
        inputContent: result.repaired,
        outputContent: nextOutput,
        error: null,
        tokenStats: stats,
      });
      return { success: true, fixes: result.fixes };
    }
    return { success: false, fixes: result.fixes };
  },
}));
