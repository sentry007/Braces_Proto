import { DiffEditor } from '@monaco-editor/react';
import { monacoTheme } from '../../lib/monaco';
import { useEditorStore } from '../../lib/store';
import { EditorLoading } from './EditorLoading';

interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
}

export default function DiffView({ original, modified, language = 'json' }: DiffViewProps) {
  const theme = useEditorStore((s) => s.theme);

  return (
    <DiffEditor
      height="100%"
      original={original}
      modified={modified}
      language={language}
      theme={monacoTheme(theme)}
      loading={<EditorLoading />}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontFamily: "'Geist Mono Variable', ui-monospace, monospace",
        fontSize: 12.5,
        lineHeight: 20,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderSideBySide: true,
        useInlineViewWhenSpaceIsLimited: true,
        wordWrap: 'on',
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
        padding: { top: 10, bottom: 10 },
      }}
    />
  );
}
