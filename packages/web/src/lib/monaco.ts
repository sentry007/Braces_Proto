/**
 * Bundles Monaco locally instead of loading it from a CDN, so the app makes no
 * third-party requests. Only the editor features and languages Bracer uses are
 * included. Importing this module configures @monaco-editor/react's loader.
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/ini/ini.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker';
import { loader } from '@monaco-editor/react';
import type { ThemeName } from './store';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    return label === 'json' ? new JsonWorker() : new EditorWorker();
  },
};

loader.config({ monaco });

interface Palette {
  base: 'vs' | 'vs-dark';
  bg: string;
  fg: string;
  key: string;
  string: string;
  number: string;
  keyword: string;
  punctuation: string;
  comment: string;
  lineNumber: string;
  lineNumberActive: string;
  selection: string;
  lineHighlight: string;
}

const PALETTES: Record<ThemeName, Palette> = {
  indigo: {
    base: 'vs-dark',
    bg: '#0f0f11',
    fg: '#d4d4d8',
    key: '#818cf8',
    string: '#5eead4',
    number: '#fcd34d',
    keyword: '#c4b5fd',
    punctuation: '#71717a',
    comment: '#6b6b74',
    lineNumber: '#4b4b53',
    lineNumberActive: '#a1a1aa',
    selection: '#4f46e555',
    lineHighlight: '#ffffff08',
  },
  amber: {
    base: 'vs-dark',
    bg: '#121010',
    fg: '#e7e5e4',
    key: '#7dd3fc',
    string: '#fcd34d',
    number: '#bef264',
    keyword: '#fda4af',
    punctuation: '#78716c',
    comment: '#78716c',
    lineNumber: '#57534e',
    lineNumberActive: '#a8a29e',
    selection: '#f59e0b40',
    lineHighlight: '#ffffff08',
  },
  paper: {
    base: 'vs',
    bg: '#ffffff',
    fg: '#18181b',
    key: '#4338ca',
    string: '#0f766e',
    number: '#b45309',
    keyword: '#be185d',
    punctuation: '#71717a',
    comment: '#71717a',
    lineNumber: '#a1a1aa',
    lineNumberActive: '#52525b',
    selection: '#4f46e526',
    lineHighlight: '#0000000a',
  },
};

const hex = (color: string) => color.replace('#', '');

for (const [name, p] of Object.entries(PALETTES)) {
  monaco.editor.defineTheme(`bracer-${name}`, {
    base: p.base,
    inherit: true,
    rules: [
      { token: '', foreground: hex(p.fg) },
      { token: 'string.key.json', foreground: hex(p.key) },
      { token: 'string.value.json', foreground: hex(p.string) },
      { token: 'string', foreground: hex(p.string) },
      { token: 'number', foreground: hex(p.number) },
      { token: 'keyword', foreground: hex(p.keyword) },
      { token: 'type', foreground: hex(p.key) },
      { token: 'type.identifier', foreground: hex(p.key) },
      { token: 'tag', foreground: hex(p.key) },
      { token: 'attribute.name', foreground: hex(p.keyword) },
      { token: 'attribute.value', foreground: hex(p.string) },
      { token: 'delimiter', foreground: hex(p.punctuation) },
      { token: 'comment', foreground: hex(p.comment), fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': p.bg,
      'editor.foreground': p.fg,
      'editorLineNumber.foreground': p.lineNumber,
      'editorLineNumber.activeForeground': p.lineNumberActive,
      'editor.selectionBackground': p.selection,
      'editor.lineHighlightBackground': p.lineHighlight,
      'editor.lineHighlightBorder': '#00000000',
      'editorGutter.background': p.bg,
      'editorWidget.background': p.bg,
      'scrollbarSlider.background': `${p.lineNumber}66`,
      'scrollbarSlider.hoverBackground': `${p.lineNumber}99`,
      // Keep brackets quiet instead of the default rainbow pair colors
      'editorBracketHighlight.foreground1': p.punctuation,
      'editorBracketHighlight.foreground2': p.punctuation,
      'editorBracketHighlight.foreground3': p.punctuation,
      'editorBracketHighlight.foreground4': p.punctuation,
      'editorBracketHighlight.foreground5': p.punctuation,
      'editorBracketHighlight.foreground6': p.punctuation,
      'editorBracketMatch.background': '#00000000',
      'editorBracketMatch.border': p.lineNumber,
    },
  });
}

// TOON: highlight headers (`users[2]{id,name}:`) and keys; leave row values plain
monaco.languages.register({ id: 'toon', extensions: ['.toon'] });
monaco.languages.setMonarchTokensProvider('toon', {
  tokenizer: {
    // Monarch reads every capture group's length, so optional parts live inside
    // the groups ((?:x)?) rather than as optional groups ((x)?)
    root: [
      [/^(\s*)((?:- )?)((?:[A-Za-z_][\w.-]*|"[^"]*")?)(\[[^\]]*\])((?:\{[^}]*\})?)(:)/, ['', 'delimiter', 'type', 'delimiter', 'delimiter', 'delimiter']],
      [/^(\s*)((?:- )?)([A-Za-z_][\w.-]*|"[^"]*")(:)/, ['', 'delimiter', 'type', 'delimiter']],
      [/^\s*- /, 'delimiter'],
      [/"(?:[^"\\]|\\.)*"/, 'string'],
      [/\b(?:true|false|null)\b/, 'keyword'],
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?=[,|\t]|\s*$)/, 'number'],
      [/[,|]/, 'delimiter'],
    ],
  },
});

export function monacoTheme(theme: ThemeName): string {
  return `bracer-${theme}`;
}

export { monaco };
