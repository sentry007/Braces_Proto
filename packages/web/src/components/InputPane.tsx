import { Suspense, useRef, useState } from 'react';
import type { OnMount } from '@monaco-editor/react';
import { AlertCircle, Braces, Upload, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '../lib/store';
import { uploadFile } from '../lib/file-handler';
import { cleanErrorMessage, formatBytes, formatInfo } from '../lib/formats';
import { CodeEditor } from './editors/lazy';
import { EditorLoading } from './editors/EditorLoading';
import { TreeEditor } from './editors/TreeEditor';
import { FormEditor } from './editors/FormEditor';
import { TextView } from './editors/TextView';
import { ErrorBoundary } from './ErrorBoundary';
import { Tabs } from './ui/Tabs';
import type { InputEditorMode } from '../types';

type MonacoEditor = Parameters<OnMount>[0];

const MODES: { value: InputEditorMode; label: string }[] = [
  { value: 'code', label: 'Code' },
  { value: 'tree', label: 'Tree' },
  { value: 'form', label: 'Form' },
  { value: 'text', label: 'Text' },
];

function JsonOnlyNotice() {
  const { inputFormat, inputJSON, convertInputToJSON, setInputMode } = useEditorStore();
  const label = formatInfo(inputFormat).label;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3.5 p-6 text-center">
      <div className="flex size-9 items-center justify-center rounded-lg border border-line-strong bg-raised text-fg-2">
        <Braces className="size-[18px]" aria-hidden="true" />
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="text-sm font-medium">Tree and form views edit JSON</p>
        <p className="leading-relaxed text-fg-2">
          Your input is {label}. Convert it to JSON to edit it visually. You can switch back at any time with the From menu.
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={() => setInputMode('code')}>
          Back to code
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!inputJSON}
          title={inputJSON ? undefined : `Fix the ${label} errors first`}
          onClick={() => convertInputToJSON()}
        >
          Convert to JSON
        </button>
      </div>
    </div>
  );
}

function ErrorBar({ onGoToLine }: { onGoToLine?: (line: number, column: number) => void }) {
  const { inputStatus, inputFormat, inputMode, repairInput } = useEditorStore();
  if (inputStatus.valid || inputStatus.empty) return null;
  const { line, column, message } = inputStatus;

  const repair = () => {
    const result = repairInput();
    if (result.success) toast.success('Repaired JSON', { description: result.fixes.join(' · ') });
    else toast.error('Could not repair this input', { description: result.error });
  };

  return (
    <div
      role="alert"
      data-testid="input-error"
      className="flex shrink-0 items-center gap-2.5 border-t border-danger-edge bg-danger-tint py-2 pr-2 pl-3 text-[12.5px] text-danger-fg"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">
        {cleanErrorMessage(message ?? 'Invalid input')}
        {line !== undefined && (
          <span className="text-fg-2">
            {' '}· line {line}, col {column ?? 1}
          </span>
        )}
      </span>
      {line !== undefined && inputMode === 'code' && onGoToLine && (
        <button type="button" className="btn btn-ghost h-7 text-fg" onClick={() => onGoToLine(line, column ?? 1)}>
          Go to line
        </button>
      )}
      {inputFormat === 'json' && (
        <button type="button" className="btn btn-primary h-7" onClick={repair}>
          <Wrench />
          Repair
        </button>
      )}
    </div>
  );
}

function StatusLine() {
  const { inputContent, inputStatus, inputFormat } = useEditorStore();
  const lines = inputContent ? inputContent.split('\n').length : 0;
  const label = formatInfo(inputFormat).label;
  return (
    <div className="flex h-7 shrink-0 items-center gap-2.5 border-t border-line px-3 text-xs text-muted">
      <span>
        {lines} {lines === 1 ? 'line' : 'lines'} · {formatBytes(inputContent.length)}
      </span>
      <div className="flex-1" />
      {inputStatus.empty ? (
        <span>Empty</span>
      ) : inputStatus.valid ? (
        <span className="inline-flex items-center gap-1.5" data-testid="input-status">
          <span className="size-1.5 rounded-full bg-positive" aria-hidden="true" />
          Valid {label}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-danger-fg" data-testid="input-status">
          <span className="size-1.5 rounded-full bg-danger" aria-hidden="true" />
          Invalid {label}
        </span>
      )}
    </div>
  );
}

export function InputPane() {
  const { inputContent, inputMode, inputFormat, setInputContent, setInputWithFormat, setInputMode } = useEditorStore();
  const [dragging, setDragging] = useState(false);
  const editor = useRef<MonacoEditor | null>(null);
  const jsonOnlyView = (inputMode === 'tree' || inputMode === 'form') && inputFormat !== 'json';

  const goToLine = (line: number, column: number) => {
    const ed = editor.current;
    if (!ed) return;
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column });
    ed.focus();
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result.success && result.content !== undefined) {
      setInputWithFormat(result.content, result.format ?? 'json');
      toast.success(`Opened ${file.name}`);
    } else {
      toast.error(result.error ?? 'Could not open that file');
    }
  };

  const renderEditor = () => {
    if (jsonOnlyView) return <JsonOnlyNotice />;
    switch (inputMode) {
      case 'tree':
        return <TreeEditor value={inputContent} />;
      case 'form':
        return <FormEditor value={inputContent} />;
      case 'text':
        return <TextView value={inputContent} onChange={setInputContent} />;
      default:
        return (
          <Suspense fallback={<EditorLoading />}>
            <CodeEditor
              label="Input"
              value={inputContent}
              onChange={setInputContent}
              language={formatInfo(inputFormat).language}
              onMount={(ed) => {
                editor.current = ed;
              }}
            />
          </Suspense>
        );
    }
  };

  return (
    <section
      aria-label="Input"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={handleDrop}
      className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface"
    >
      {dragging && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary bg-bg/90 text-center">
          <Upload className="size-6 text-fg-2" aria-hidden="true" />
          <p className="font-medium">Drop to open</p>
          <p className="text-xs text-muted">JSON, TOON, YAML, TOML, CSV or XML</p>
        </div>
      )}

      <div className="flex h-[42px] shrink-0 items-center gap-2 border-b border-line pr-2 pl-3">
        <h2 className="font-medium">Input</h2>
        <span className="badge">{formatInfo(inputFormat).label}</span>
        <div className="flex-1" />
        <Tabs label="Input view" value={inputMode} options={MODES} onChange={setInputMode} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ErrorBoundary label="input">{renderEditor()}</ErrorBoundary>
      </div>

      <ErrorBar onGoToLine={goToLine} />
      <StatusLine />
    </section>
  );
}
