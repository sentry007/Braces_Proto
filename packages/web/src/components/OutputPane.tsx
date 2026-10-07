import { Suspense, useMemo, useState } from 'react';
import { Check, Copy, Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import { estimateTokens } from 'bracer';
import { useEditorStore } from '../lib/store';
import { copyToClipboard, downloadFile } from '../lib/file-handler';
import { formatBytes, targetBadge, targetInfo } from '../lib/formats';
import { CodeEditor, DiffView } from './editors/lazy';
import { EditorLoading } from './editors/EditorLoading';
import { PreviewView } from './editors/PreviewView';
import { ErrorBoundary } from './ErrorBoundary';
import { Tabs } from './ui/Tabs';
import type { OutputEditorMode } from '../types';

const MODES: { value: OutputEditorMode; label: string }[] = [
  { value: 'code', label: 'Code' },
  { value: 'preview', label: 'Preview' },
  { value: 'diff', label: 'Diff' },
];

export function OutputPane() {
  const { inputContent, inputJSON, outputContent, outputError, outputStale, outputMode, outputTarget, tokenStats, setOutputMode } =
    useEditorStore();
  const [copied, setCopied] = useState(false);
  const info = targetInfo(outputTarget);
  const lines = outputContent ? outputContent.split('\n').length : 0;
  // tokenStats.tokenizer flips once the exact tokenizer loads, so recount then too
  const outputTokens = useMemo(
    () => (outputContent && outputContent.length <= 1_000_000 ? estimateTokens(outputContent) : null),
    [outputContent, tokenStats.tokenizer] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleCopy = async () => {
    if (await copyToClipboard(outputContent)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error('Could not copy to the clipboard');
    }
  };

  const renderContent = () => {
    if (!outputContent) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-muted">
          Paste or type data on the left to see it converted here.
        </div>
      );
    }
    switch (outputMode) {
      case 'preview':
        return <PreviewView json={inputJSON} />;
      case 'diff':
        return (
          <Suspense fallback={<EditorLoading />}>
            <DiffView original={inputContent} modified={outputContent} language={info.language} />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<EditorLoading />}>
            <CodeEditor label="Output" value={outputContent} readOnly language={info.language} />
          </Suspense>
        );
    }
  };

  return (
    <section aria-label="Output" className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex h-[42px] shrink-0 items-center gap-2 border-b border-line pr-2 pl-3">
        <h2 className="font-medium">Output</h2>
        <span className="badge border-positive-edge bg-positive-tint text-positive-fg" data-testid="output-badge">
          {targetBadge(outputTarget)}
        </span>
        <div className="flex-1" />
        <Tabs label="Output view" value={outputMode} options={MODES} onChange={setOutputMode} />
        <button
          type="button"
          className="btn btn-primary h-7 max-sm:w-[30px] max-sm:justify-center max-sm:px-0"
          onClick={handleCopy}
          disabled={!outputContent}
          aria-label={copied ? 'Copied' : 'Copy output'}
        >
          {copied ? <Check /> : <Copy />}
          <span className="max-sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
        </button>
        <button
          type="button"
          className="btn btn-icon"
          disabled={!outputContent}
          aria-label="Download output"
          title={`Download as output.${info.ext}`}
          onClick={() => downloadFile(outputContent, `output.${info.ext}`, info.mime)}
        >
          <Download />
        </button>
      </div>

      {(outputStale || outputError) && (
        <div
          role="status"
          data-testid="output-stale"
          className="flex shrink-0 items-center gap-2 border-b border-line bg-bar px-3 py-2 text-[12.5px] text-fg-2"
        >
          <Info className="size-[15px] shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {outputError ? `Can't convert to ${targetBadge(outputTarget)}: ${outputError}` : 'Showing the last valid result. Fix the input to update.'}
          </span>
        </div>
      )}

      <div className={`min-h-0 flex-1 overflow-hidden ${outputStale ? 'opacity-45' : ''}`}>
        <ErrorBoundary label="output">{renderContent()}</ErrorBoundary>
      </div>

      <div className="flex h-7 shrink-0 items-center gap-2.5 border-t border-line px-3 text-xs text-muted">
        <span>
          {lines} {lines === 1 ? 'line' : 'lines'} · {formatBytes(outputContent.length)}
        </span>
        <div className="flex-1" />
        {outputStale ? (
          <span>Out of date</span>
        ) : outputTokens !== null ? (
          <span data-testid="output-tokens">
            {tokenStats.tokenizer === 'estimate' ? `~${outputTokens} tokens` : `${outputTokens} tokens · o200k_base`}
          </span>
        ) : null}
      </div>
    </section>
  );
}
