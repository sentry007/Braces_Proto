import { useEditorStore } from '../lib/store';
import { ModeSelector } from './ui/ModeSelector';
import { CodeEditor } from './editors/CodeEditor';
import { TreeEditor } from './editors/TreeEditor';
import { FormEditor } from './editors/FormEditor';
import { TextView } from './editors/TextView';
import { PreviewView } from './editors/PreviewView';

export function InputPane() {
  const {
    inputContent,
    inputMode,
    setInputContent,
    setInputMode,
  } = useEditorStore();

  const renderEditor = () => {
    switch (inputMode) {
      case 'code':
        return (
          <CodeEditor
            value={inputContent}
            onChange={setInputContent}
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
      case 'view':
        return <TreeEditor value={inputContent} readOnly />;
      case 'preview':
        return <PreviewView value={inputContent} />;
      default:
        return (
          <CodeEditor
            value={inputContent}
            onChange={setInputContent}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200">Input</h2>
        <ModeSelector
          currentMode={inputMode}
          onChange={setInputMode}
          label="Mode"
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {renderEditor()}
      </div>
    </div>
  );
}
