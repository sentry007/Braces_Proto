import Editor, { type OnMount } from '@monaco-editor/react';
import { monacoTheme } from '../../lib/monaco';
import { useEditorStore } from '../../lib/store';
import { EditorLoading } from './EditorLoading';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: string;
  label: string;
  onMount?: OnMount;
}

export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  language = 'json',
  label,
  onMount,
}: CodeEditorProps) {
  const theme = useEditorStore((s) => s.theme);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(val) => {
        if (onChange && val !== undefined) onChange(val);
      }}
      onMount={onMount}
      theme={monacoTheme(theme)}
      loading={<EditorLoading />}
      options={{
        readOnly,
        ariaLabel: label,
        minimap: { enabled: false },
        fontFamily: "'Geist Mono Variable', ui-monospace, monospace",
        fontSize: 12.5,
        lineHeight: 20,
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        renderLineHighlight: readOnly ? 'none' : 'line',
        bracketPairColorization: { enabled: false },
        guides: { indentation: false },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
        padding: { top: 10, bottom: 10 },
        fixedOverflowWidgets: true,
      }}
    />
  );
}
