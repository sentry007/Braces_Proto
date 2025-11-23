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
  const handleEditorChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
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
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
            Loading editor...
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
