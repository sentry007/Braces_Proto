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
  validateJSON,
  jsonToTypeScript,
  jsonToZod,
  jsonToJSONSchema,
  jsonToMarkdownTable,
  loadTokenizer,
} from 'bracer';

export type ThemeName = 'indigo' | 'amber' | 'paper';
export const THEMES: ThemeName[] = ['indigo', 'amber', 'paper'];
const THEME_KEY = 'bracer-theme';

export interface InputStatus {
  valid: boolean;
  empty: boolean;
  message?: string;
  line?: number;
  column?: number;
}

export const SAMPLE_JSON = `{
  "tickets": [
    {
      "id": 4812,
      "customer": "Acme Corp",
      "priority": "high",
      "status": "open",
      "summary": "Export to CSV drops columns"
    },
    {
      "id": 4813,
      "customer": "Globex",
      "priority": "low",
      "status": "closed",
      "summary": "Typo in invoice footer"
    },
    {
      "id": 4814,
      "customer": "Initech",
      "priority": "medium",
      "status": "open",
      "summary": "SSO login loops on Safari"
    }
  ]
}`;

/** Inputs larger than this skip token counting and are processed debounced. */
const LARGE_INPUT = 1_000_000;
const DEBOUNCE_THRESHOLD = 50_000;
const HISTORY_LIMIT = 50;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function produceOutput(json: string, target: OutputTarget, indent: IndentSize): string {
  if (target.kind === 'format') {
    return target.format === 'json'
      ? formatJSON(json, indent)
      : convertContent(json, 'json', target.format, indent);
  }
  switch (target.generator) {
    case 'typescript':
      return jsonToTypeScript(json);
    case 'zod':
      return jsonToZod(json);
    case 'json-schema':
      return jsonToJSONSchema(json);
    case 'markdown-table':
      return jsonToMarkdownTable(json);
  }
}

interface Analysis {
  inputJSON: string | null;
  inputStatus: InputStatus;
  tokenStats: TokenStats;
  outputContent: string;
  outputError: string | null;
  outputStale: boolean;
}

/**
 * Validates the input in its own format, normalizes it to JSON, and produces the
 * output. When anything fails, the previous output is kept and marked stale.
 */
function analyze(
  content: string,
  format: ConversionFormat,
  target: OutputTarget,
  indent: IndentSize,
  previousOutput: string
): Analysis {
  if (content.trim() === '') {
    return {
      inputJSON: null,
      inputStatus: { valid: true, empty: true },
      tokenStats: calculateTokenStats(''),
      outputContent: '',
      outputError: null,
      outputStale: false,
    };
  }

  let inputJSON: string | null = null;
  let inputStatus: InputStatus;
  if (format === 'json') {
    const result = validateJSON(content);
    inputStatus = result.isValid
      ? { valid: true, empty: false }
      : { valid: false, empty: false, ...result.error };
    if (result.isValid) inputJSON = content;
  } else {
    try {
      inputJSON = convertContent(content, format, 'json', indent);
      inputStatus = { valid: true, empty: false };
    } catch (err) {
      inputStatus = { valid: false, empty: false, message: errorMessage(err) };
    }
  }

  const tokenStats =
    inputJSON && content.length <= LARGE_INPUT ? calculateTokenStats(inputJSON) : calculateTokenStats('');

  if (!inputJSON) {
    return {
      inputJSON,
      inputStatus,
      tokenStats,
      outputContent: previousOutput,
      outputError: null,
      outputStale: previousOutput !== '',
    };
  }

  try {
    return {
      inputJSON,
      inputStatus,
      tokenStats,
      outputContent: produceOutput(inputJSON, target, indent),
      outputError: null,
      outputStale: false,
    };
  } catch (err) {
    return {
      inputJSON,
      inputStatus,
      tokenStats,
      outputContent: previousOutput,
      outputError: errorMessage(err),
      outputStale: previousOutput !== '',
    };
  }
}

function initialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_KEY) as ThemeName | null;
    if (saved && THEMES.includes(saved)) return saved;
  } catch {
    // Storage unavailable (private mode, blocked site data): fall through
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'paper'
    : 'indigo';
}

function applyTheme(theme: ThemeName) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

interface EditorStore extends Analysis {
  inputContent: string;

  // History for undo/redo
  history: string[];
  future: string[];
  canUndo: boolean;
  canRedo: boolean;

  // Modes and targets
  inputMode: InputEditorMode;
  outputMode: OutputEditorMode;
  inputFormat: ConversionFormat;
  outputTarget: OutputTarget;
  indentSize: IndentSize;
  theme: ThemeName;

  // Actions
  setInputContent: (content: string, recordHistory?: boolean) => void;
  setInputWithFormat: (content: string, format: ConversionFormat) => void;
  setInputMode: (mode: InputEditorMode) => void;
  setOutputMode: (mode: OutputEditorMode) => void;
  setInputFormat: (format: ConversionFormat) => void;
  setOutputTarget: (target: OutputTarget) => void;
  setIndentSize: (size: IndentSize) => void;
  cycleTheme: () => void;
  convertInputToJSON: () => boolean;
  clearAll: () => void;
  loadSample: () => void;
  repairInput: () => { success: boolean; fixes: string[]; error?: string };
  undo: () => void;
  redo: () => void;
}

const initialTarget: OutputTarget = { kind: 'format', format: 'toon' };
const startTheme = initialTheme();
applyTheme(startTheme);

let pending: ReturnType<typeof setTimeout> | undefined;

export const useEditorStore = create<EditorStore>((set, get) => {
  /** Re-runs analysis for the current state (optionally overriding fields) and stores it. */
  const refresh = (overrides: Partial<EditorStore> = {}) => {
    clearTimeout(pending);
    const s = { ...get(), ...overrides };
    set({
      ...overrides,
      ...analyze(s.inputContent, s.inputFormat, s.outputTarget, s.indentSize, s.outputContent),
    });
  };

  /** Replaces the input, pushing the old value onto the undo history. */
  const replaceInput = (content: string, extra: Partial<EditorStore> = {}) => {
    const { inputContent, history } = get();
    const nextHistory = [inputContent, ...history.slice(0, HISTORY_LIMIT - 1)];
    refresh({
      ...extra,
      inputContent: content,
      history: nextHistory,
      future: [],
      canUndo: true,
      canRedo: false,
    });
  };

  return {
    inputContent: SAMPLE_JSON,
    ...analyze(SAMPLE_JSON, 'json', initialTarget, 2, ''),
    history: [],
    future: [],
    canUndo: false,
    canRedo: false,
    inputMode: 'code',
    outputMode: 'code',
    inputFormat: 'json',
    outputTarget: initialTarget,
    indentSize: 2,
    theme: startTheme,

    setInputContent: (content, recordHistory = true) => {
      const { inputContent, history, future } = get();
      if (content === inputContent) return;

      const nextHistory = recordHistory
        ? [inputContent, ...history.slice(0, HISTORY_LIMIT - 1)]
        : history;
      const nextFuture = recordHistory ? [] : future;
      const historyState = {
        inputContent: content,
        history: nextHistory,
        future: nextFuture,
        canUndo: nextHistory.length > 0,
        canRedo: nextFuture.length > 0,
      };

      if (content.length < DEBOUNCE_THRESHOLD) {
        refresh(historyState);
        return;
      }
      // Large input: update the text now, re-analyze once typing pauses
      clearTimeout(pending);
      set(historyState);
      pending = setTimeout(() => refresh(), 200);
    },

    setInputWithFormat: (content, format) => replaceInput(content, { inputFormat: format }),

    setInputMode: (mode) => set({ inputMode: mode }),
    setOutputMode: (mode) => set({ outputMode: mode }),
    setInputFormat: (format) => refresh({ inputFormat: format }),
    setOutputTarget: (target) => refresh({ outputTarget: target }),
    setIndentSize: (size) => refresh({ indentSize: size }),

    cycleTheme: () => {
      const next = THEMES[(THEMES.indexOf(get().theme) + 1) % THEMES.length];
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // Not persisted; the theme still applies for this visit
      }
      applyTheme(next);
      set({ theme: next });
    },

    convertInputToJSON: () => {
      const { inputJSON, inputFormat, indentSize } = get();
      if (inputFormat === 'json' || !inputJSON) return false;
      replaceInput(formatJSON(inputJSON, indentSize), { inputFormat: 'json' });
      return true;
    },

    clearAll: () => replaceInput(''),

    loadSample: () => replaceInput(SAMPLE_JSON, { inputFormat: 'json' }),

    repairInput: () => {
      const { inputContent, inputFormat } = get();
      const result = repairJSON(inputContent);
      if (!result.success) {
        return { success: false, fixes: result.fixes, error: result.error };
      }
      replaceInput(result.repaired, inputFormat === 'json' ? {} : { inputFormat: 'json' });
      return { success: true, fixes: result.fixes };
    },

    undo: () => {
      const { history, future, inputContent } = get();
      if (history.length === 0) return;
      const newHistory = history.slice(1);
      const newFuture = [inputContent, ...future.slice(0, HISTORY_LIMIT - 1)];
      refresh({
        inputContent: history[0],
        history: newHistory,
        future: newFuture,
        canUndo: newHistory.length > 0,
        canRedo: true,
      });
    },

    redo: () => {
      const { history, future, inputContent } = get();
      if (future.length === 0) return;
      const newFuture = future.slice(1);
      const newHistory = [inputContent, ...history.slice(0, HISTORY_LIMIT - 1)];
      refresh({
        inputContent: future[0],
        history: newHistory,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      });
    },
  };
});

// The o200k_base rank table is a separate ~2 MB chunk; counts are estimates
// until it arrives, then recomputed exactly.
void loadTokenizer().then((loaded) => {
  if (loaded) {
    const { inputJSON, inputContent } = useEditorStore.getState();
    useEditorStore.setState({
      tokenStats:
        inputJSON && inputContent.length <= LARGE_INPUT
          ? calculateTokenStats(inputJSON)
          : calculateTokenStats(''),
    });
  }
});
