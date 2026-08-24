import { useState } from 'react';
import { useEditorStore } from '../lib/store';
import { OutputModeSelector } from './ui/ModeSelector';
import { CodeEditor } from './editors/CodeEditor';
import { PreviewView } from './editors/PreviewView';
import { DiffView } from './editors/DiffView';
import { copyToClipboard, downloadFile } from '../lib/file-handler';
import { Copy, Check, Download, FileCode, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function OutputPane() {
  const {
    inputContent,
    outputContent,
    outputMode,
    outputTarget,
    isDarkMode,
    setOutputMode,
  } = useEditorStore();

  const [copied, setCopied] = useState(false);

  const lineCount = outputContent ? outputContent.split('\n').length : 0;
  const charCount = outputContent.length;
  const sizeKB = (charCount / 1024).toFixed(1);

  const targetLabel =
    outputTarget.kind === 'format'
      ? outputTarget.format.toUpperCase()
      : outputTarget.generator.toUpperCase();

  const handleCopy = async () => {
    if (!outputContent) return;
    const success = await copyToClipboard(outputContent);
    if (success) {
      setCopied(true);
      toast.success('Copied transformed output to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!outputContent) {
      toast.error('No output to download');
      return;
    }
    const ext =
      outputTarget.kind === 'format'
        ? outputTarget.format === 'toon'
          ? 'toon'
          : outputTarget.format
        : outputTarget.generator === 'typescript' || outputTarget.generator === 'zod'
        ? 'ts'
        : outputTarget.generator === 'markdown-table'
        ? 'md'
        : 'json';

    downloadFile(outputContent, `transformed_output.${ext}`);
    toast.success(`Downloaded transformed_output.${ext}`);
  };

  const getLanguage = () => {
    if (outputTarget.kind === 'format') {
      if (outputTarget.format === 'xml') return 'xml';
      if (outputTarget.format === 'yaml') return 'yaml';
      if (outputTarget.format === 'toml') return 'ini';
      if (outputTarget.format === 'csv') return 'plaintext';
      if (outputTarget.format === 'toon') return 'json';
      return 'json';
    } else {
      if (outputTarget.generator === 'typescript' || outputTarget.generator === 'zod') return 'typescript';
      if (outputTarget.generator === 'markdown-table') return 'markdown';
      return 'json';
    }
  };

  const renderContent = () => {
    if (!outputContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-900/40">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 mb-3">
            <ArrowRight className="w-6 h-6" />
          </div>
          <p className="text-gray-400 font-medium text-sm">No output available</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            Type or paste content in the Input pane to see live transformations in real-time.
          </p>
        </div>
      );
    }

    switch (outputMode) {
      case 'code':
        return (
          <CodeEditor
            value={outputContent}
            readOnly
            language={getLanguage()}
            theme={isDarkMode ? 'vs-dark' : 'light'}
          />
        );
      case 'preview':
        return <PreviewView value={outputContent} />;
      case 'diff':
        return (
          <DiffView
            original={inputContent}
            modified={outputContent}
            language={getLanguage()}
            theme={isDarkMode ? 'vs-dark' : 'light'}
          />
        );
      default:
        return (
          <CodeEditor
            value={outputContent}
            readOnly
            language={getLanguage()}
            theme={isDarkMode ? 'vs-dark' : 'light'}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/90 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* Pane Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-gray-800/80 border-b border-gray-800 gap-2">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">
            Live Output
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded uppercase">
            {targetLabel}
          </span>
          {outputContent && (
            <span className="text-[11px] text-gray-400 hidden sm:inline font-mono">
              ({lineCount} lines • {sizeKB} KB)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!outputContent}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm"
            title="Copy output to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!outputContent}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 disabled:text-gray-600 disabled:hover:bg-transparent rounded-lg transition-colors"
            title="Download output file"
          >
            <Download className="w-4 h-4" />
          </button>

          <OutputModeSelector
            currentMode={outputMode}
            onChange={setOutputMode}
          />
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>
    </div>
  );
}
