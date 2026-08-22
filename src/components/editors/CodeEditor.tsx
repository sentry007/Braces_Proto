import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: string;
  theme?: 'light' | 'vs-dark';
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  language = 'json',
  theme = 'vs-dark',
}: CodeEditorProps) {
  const handleEditorChange = (val: string | undefined) => {
    if (onChange && val !== undefined) {
      onChange(val);
    }
  };

  return (
    <div className="w-full h-full">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleEditorChange}
        theme={theme}
        loading={
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400 text-xs">
            Loading Monaco editor...
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          bracketPairColorization: {
            enabled: true,
          },
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
