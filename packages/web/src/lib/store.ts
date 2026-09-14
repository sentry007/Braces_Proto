import { create } from 'zustand';
import type {
  InputEditorMode,
  OutputEditorMode,
  IndentSize,
  ConversionFormat,
  OutputTarget,
  TokenStats,
} from '../types';
import {
  calculateTokenStats,
  repairJSON,
  convertContent,
  formatJSON,
  jsonToTypeScript,
  jsonToZod,
  jsonToJSONSchema,
  jsonToMarkdownTable,
} from '@braces/core';

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
      // Normalize input to JSON first so generators work seamlessly on any input format (YAML, TOML, XML, CSV, TOON)
      const jsonInput =
        inputFormat === 'json' ? input : convertContent(input, inputFormat, 'json', indent);
      switch (target.generator) {
        case 'typescript':
          return jsonToTypeScript(jsonInput);
        case 'zod':
          return jsonToZod(jsonInput);
        case 'json-schema':
          return jsonToJSONSchema(jsonInput);
        case 'markdown-table':
          return jsonToMarkdownTable(jsonInput);
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

  // History for Undo/Redo
  history: string[];
  future: string[];
  canUndo: boolean;
  canRedo: boolean;

  // Editor modes & targets
  inputMode: InputEditorMode;
  outputMode: OutputEditorMode;
  inputFormat: ConversionFormat;
  outputTarget: OutputTarget;

  // Settings
  indentSize: IndentSize;
  isDarkMode: boolean;
  isAutoSync: boolean;

  // UI & Stats
  isLoading: boolean;
  error: string | null;
  tokenStats: TokenStats;

  // Actions
  setInputContent: (content: string, recordHistory?: boolean) => void;
  setInputWithFormat: (content: string, format: ConversionFormat) => void;
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
  undo: () => void;
  redo: () => void;
}

const initialTarget: OutputTarget = { kind: 'format', format: 'json' };
const initialOutput = transformInput(sampleJSON, 'json', initialTarget, 2);

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  inputContent: sampleJSON,
  outputContent: initialOutput,
  history: [],
  future: [],
  canUndo: false,
  canRedo: false,
  inputMode: 'code',
  outputMode: 'code',
  inputFormat: 'json',
  outputTarget: initialTarget,
  indentSize: 2,
  isDarkMode: true,
  isAutoSync: true,
  isLoading: false,
  error: null,
  tokenStats: calculateTokenStats(sampleJSON),

  // Actions
  setInputContent: (content, recordHistory = true) => {
    const { inputContent, history, inputFormat, outputTarget, indentSize, isAutoSync } = get();
    if (content === inputContent) return;

    let nextHistory = history;
    let nextFuture = get().future;
    if (recordHistory) {
      nextHistory = [inputContent, ...history.slice(0, 49)];
      nextFuture = [];
    }

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
      history: nextHistory,
      future: nextFuture,
      canUndo: nextHistory.length > 0,
      canRedo: nextFuture.length > 0,
    });
  },

  setInputWithFormat: (content, format) => {
    const { inputContent, history, outputTarget, indentSize, isAutoSync } = get();
    const nextHistory = [inputContent, ...history.slice(0, 49)];
    const stats = calculateTokenStats(content);

    let nextOutput = get().outputContent;
    if (isAutoSync) {
      const live = transformInput(content, format, outputTarget, indentSize);
      if (live || content.trim() === '') {
        nextOutput = live;
      }
    }

    set({
      inputContent: content,
      inputFormat: format,
      outputContent: nextOutput,
      tokenStats: stats,
      history: nextHistory,
      future: [],
      canUndo: true,
      canRedo: false,
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

  clearAll: () => {
    const { inputContent, history } = get();
    const nextHistory = inputContent ? [inputContent, ...history.slice(0, 49)] : history;
    set({
      inputContent: '',
      outputContent: '',
      error: null,
      history: nextHistory,
      future: [],
      canUndo: nextHistory.length > 0,
      canRedo: false,
      tokenStats: {
        jsonTokens: 0,
        toonTokens: 0,
        yamlTokens: 0,
        minifiedTokens: 0,
        savedPercent: 0,
      },
    });
  },

  loadSample: () => {
    const { inputContent, history, outputTarget, indentSize } = get();
    const nextHistory = [inputContent, ...history.slice(0, 49)];
    const stats = calculateTokenStats(sampleJSON);
    const nextOutput = transformInput(sampleJSON, 'json', outputTarget, indentSize);

    set({
      inputContent: sampleJSON,
      outputContent: nextOutput,
      inputFormat: 'json',
      error: null,
      tokenStats: stats,
      history: nextHistory,
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  repairInput: () => {
    const { inputContent, history, inputFormat, outputTarget, indentSize } = get();
    const result = repairJSON(inputContent);
    if (result.success && result.repaired) {
      const nextHistory = [inputContent, ...history.slice(0, 49)];
      const stats = calculateTokenStats(result.repaired);
      const nextOutput = transformInput(result.repaired, inputFormat, outputTarget, indentSize);
      set({
        inputContent: result.repaired,
        outputContent: nextOutput,
        error: null,
        tokenStats: stats,
        history: nextHistory,
        future: [],
        canUndo: true,
        canRedo: false,
      });
      return { success: true, fixes: result.fixes };
    }
    return { success: false, fixes: result.fixes };
  },

  undo: () => {
    const { history, future, inputContent, inputFormat, outputTarget, indentSize, isAutoSync } = get();
    if (history.length === 0) return;
    const previous = history[0];
    const newHistory = history.slice(1);
    const newFuture = [inputContent, ...future.slice(0, 49)];
    const stats = calculateTokenStats(previous);
    let nextOutput = get().outputContent;
    if (isAutoSync) {
      const live = transformInput(previous, inputFormat, outputTarget, indentSize);
      if (live || previous.trim() === '') {
        nextOutput = live;
      }
    }
    set({
      inputContent: previous,
      outputContent: nextOutput,
      tokenStats: stats,
      history: newHistory,
      future: newFuture,
      canUndo: newHistory.length > 0,
      canRedo: newFuture.length > 0,
    });
  },

  redo: () => {
    const { history, future, inputContent, inputFormat, outputTarget, indentSize, isAutoSync } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const newHistory = [inputContent, ...history.slice(0, 49)];
    const stats = calculateTokenStats(next);
    let nextOutput = get().outputContent;
    if (isAutoSync) {
      const live = transformInput(next, inputFormat, outputTarget, indentSize);
      if (live || next.trim() === '') {
        nextOutput = live;
      }
    }
    set({
      inputContent: next,
      outputContent: nextOutput,
      tokenStats: stats,
      history: newHistory,
      future: newFuture,
      canUndo: newHistory.length > 0,
      canRedo: newFuture.length > 0,
    });
  },
}));
