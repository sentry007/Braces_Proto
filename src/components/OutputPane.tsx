import { useEditorStore } from '../lib/store';
import { ModeSelector } from './ui/ModeSelector';
import { CodeEditor } from './editors/CodeEditor';
import { TreeEditor } from './editors/TreeEditor';
import { FormEditor } from './editors/FormEditor';
import { TextView } from './editors/TextView';
import { PreviewView } from './editors/PreviewView';
import { copyToClipboard } from '../lib/file-handler';
import { toast } from 'sonner';

export function OutputPane() {
  const {
    outputContent,
    outputMode,
    setOutputMode,
  } = useEditorStore();

  const handleCopy = async () => {
    const success = await copyToClipboard(outputContent);
    if (success) {
      toast.success('Copied to clipboard!');
    } else {
      toast.error('Failed to copy');
    }
  };

  const renderEditor = () => {
    switch (outputMode) {
      case 'code':
        return (
          <CodeEditor
            value={outputContent}
            readOnly
          />
        );
      case 'tree':
        return <TreeEditor value={outputContent} readOnly />;
      case 'form':
        return <FormEditor value={outputContent} readOnly />;
      case 'text':
        return (
          <TextView
            value={outputContent}
            readOnly
          />
        );
      case 'view':
        return <TreeEditor value={outputContent} readOnly />;
      case 'preview':
        return <PreviewView value={outputContent} />;
      default:
        return (
          <CodeEditor
            value={outputContent}
            readOnly
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200">Output</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            disabled={!outputContent}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
          >
            Copy
          </button>
          <ModeSelector
            currentMode={outputMode}
            onChange={setOutputMode}
            label="Mode"
          />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {renderEditor()}
      </div>
    </div>
  );
}
