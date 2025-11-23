import { create } from 'zustand';
import type { EditorMode, IndentSize } from '../types/index.js';

interface EditorStore {
  // Content
  inputContent: string;
  outputContent: string;

  // Editor modes
  inputMode: EditorMode;
  outputMode: EditorMode;

  // Settings
  indentSize: IndentSize;
  isDarkMode: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setInputContent: (content: string) => void;
  setOutputContent: (content: string) => void;
  setInputMode: (mode: EditorMode) => void;
  setOutputMode: (mode: EditorMode) => void;
  setIndentSize: (size: IndentSize) => void;
  toggleDarkMode: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
}

const sampleJSON = `{
  "name": "Braces Reborn",
  "version": "2.0.0",
  "features": [
    "JSON Validation",
    "Format & Minify",
    "Convert to XML/CSV/YAML",
    "6 Editor Modes"
  ],
  "tech": {
    "framework": "React",
    "language": "TypeScript",
    "bundler": "Vite"
  }
}`;

export const useEditorStore = create<EditorStore>((set) => ({
  // Initial state
  inputContent: sampleJSON,
  outputContent: '',
  inputMode: 'code',
  outputMode: 'code',
  indentSize: 4,
  isDarkMode: false,
  isLoading: false,
  error: null,

  // Actions
  setInputContent: (content) => set({ inputContent: content }),
  setOutputContent: (content) => set({ outputContent: content }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setOutputMode: (mode) => set({ outputMode: mode }),
  setIndentSize: (size) => set({ indentSize: size }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearAll: () => set({
    inputContent: '',
    outputContent: '',
    error: null,
  }),
}));
