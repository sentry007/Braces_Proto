import { DiffEditor } from '@monaco-editor/react';

interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
  theme?: 'light' | 'vs-dark';
}

export function DiffView({
  original,
  modified,
  language = 'json',
  theme = 'vs-dark',
}: DiffViewProps) {
  return (
    <div className="w-full h-full">
      <DiffEditor
        height="100%"
        original={original}
        modified={modified}
        language={language}
        theme={theme}
        loading={
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400 text-xs">
            Loading Diff visualizer...
          </div>
        }
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderSideBySide: true,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
