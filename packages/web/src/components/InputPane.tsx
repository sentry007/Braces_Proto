import { useState } from 'react';
import { useEditorStore } from '../lib/store';
import { InputModeSelector } from './ui/ModeSelector';
import { CodeEditor } from './editors/CodeEditor';
import { TreeEditor } from './editors/TreeEditor';
import { FormEditor } from './editors/FormEditor';
import { TextView } from './editors/TextView';
import { uploadFile } from '../lib/file-handler';
import { FileJson, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

export function InputPane() {
  const {
    inputContent,
    inputMode,
    inputFormat,
    isDarkMode,
    setInputContent,
    setInputWithFormat,
    setInputMode,
  } = useEditorStore();

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const lineCount = inputContent ? inputContent.split('\n').length : 0;
  const charCount = inputContent.length;
  const sizeKB = (charCount / 1024).toFixed(1);

  const getLanguageForFormat = () => {
    switch (inputFormat) {
      case 'json':
      case 'toon':
        return 'json';
      case 'xml':
        return 'xml';
      case 'yaml':
        return 'yaml';
      case 'toml':
        return 'ini';
      default:
        return 'json';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result.success && result.content) {
      if (result.format) {
        setInputWithFormat(result.content, result.format);
        toast.success(`Imported ${file.name} as ${result.format.toUpperCase()}!`);
      } else {
        setInputContent(result.content);
        toast.success(`Imported ${file.name}!`);
      }
    } else {
      toast.error(result.error || 'Failed to import file');
    }
  };

  const renderEditor = () => {
    switch (inputMode) {
      case 'code':
        return (
          <CodeEditor
            value={inputContent}
            onChange={setInputContent}
            language={getLanguageForFormat()}
            theme={isDarkMode ? 'vs-dark' : 'light'}
          />
        );
      case 'tree':
        return <TreeEditor value={inputContent} />;
      case 'form':
        return <FormEditor value={inputContent} />;
      case 'text':
        return (
          <TextView
            value={inputContent}
            onChange={setInputContent}
          />
        );
      default:
        return (
          <CodeEditor
            value={inputContent}
            onChange={setInputContent}
            theme={isDarkMode ? 'vs-dark' : 'light'}
          />
        );
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full bg-gray-900/90 border border-gray-800 rounded-xl overflow-hidden shadow-lg relative"
    >
      {/* Drag and Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-blue-950/80 backdrop-blur-sm border-2 border-dashed border-blue-400 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
          <UploadCloud className="w-12 h-12 text-blue-400 animate-bounce mb-3" />
          <p className="text-base font-bold text-white">Drop data file here</p>
          <p className="text-xs text-blue-200 mt-1">
            Supports JSON, YAML, XML, CSV, TOML, and TOON
          </p>
        </div>
      )}

      {/* Pane Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-gray-800/80 border-b border-gray-800 gap-2">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">
            Input Payload
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded uppercase">
            {inputFormat}
          </span>
          <span className="text-[11px] text-gray-400 hidden sm:inline font-mono">
            ({lineCount} lines • {sizeKB} KB)
          </span>
        </div>

        <InputModeSelector
          currentMode={inputMode}
          onChange={setInputMode}
        />
      </div>

      {/* Editor Surface */}
      <div className="flex-1 overflow-hidden relative">
        {renderEditor()}
      </div>
    </div>
  );
}
