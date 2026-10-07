import { useRef, useState } from 'react';
import { ArrowRight, Github, MoreHorizontal, Redo2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { THEMES, useEditorStore, type ThemeName } from '../lib/store';
import { loadFromURL } from '../lib/file-handler';
import { Logo } from './ui/Logo';
import { Menu, MenuItem, MenuSeparator } from './ui/Menu';

const THEME_LABELS: Record<ThemeName, string> = { indigo: 'Indigo', amber: 'Amber', paper: 'Paper' };

function TokenChip() {
  const stats = useEditorStore((s) => s.tokenStats);
  if (stats.jsonTokens === 0) return null;
  const approx = stats.tokenizer === 'estimate' ? '~' : '';
  const title =
    stats.tokenizer === 'o200k_base'
      ? `Exact o200k_base (GPT-4o) token counts. Formatted JSON ${stats.jsonTokens}, minified JSON ${stats.minifiedTokens}, TOON ${stats.toonTokens}. TOON saves ${stats.savedVsMinifiedPercent}% vs minified JSON.`
      : 'Estimated counts. The exact tokenizer is still loading.';

  return (
    <span
      title={title}
      data-testid="token-chip"
      className="hidden h-7 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 font-mono text-xs text-muted sm:inline-flex"
    >
      <span>
        JSON <b className="font-medium text-fg">{approx}{stats.jsonTokens}</b>
      </span>
      <ArrowRight className="size-3" aria-hidden="true" />
      <span>
        TOON <b className="font-medium text-fg">{approx}{stats.toonTokens}</b>
      </span>
      {stats.savedPercent > 0 && <span className="font-medium text-positive-fg">−{stats.savedPercent}%</span>}
    </span>
  );
}

function ThemeButton() {
  const theme = useEditorStore((s) => s.theme);
  const cycleTheme = useEditorStore((s) => s.cycleTheme);
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="btn gap-2 pr-2.5 pl-2"
      aria-label={`Theme: ${THEME_LABELS[theme]}. Switch to ${THEME_LABELS[next]}`}
      title={`Theme: ${THEME_LABELS[theme]} (click for ${THEME_LABELS[next]})`}
    >
      <span className="inline-flex items-center" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-brand-open" />
        <span className="-ml-[3px] size-2.5 rounded-full bg-brand-close ring-[1.5px] ring-raised" />
      </span>
      <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
    </button>
  );
}

function UrlDialog({ dialog }: { dialog: React.RefObject<HTMLDialogElement | null> }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const setInputWithFormat = useEditorStore((s) => s.setInputWithFormat);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await loadFromURL(url);
    setLoading(false);
    if (result.success && result.content !== undefined) {
      setInputWithFormat(result.content, result.format ?? 'json');
      toast.success(`Loaded ${(result.format ?? 'json').toUpperCase()} from URL`);
      dialog.current?.close();
      setUrl('');
    } else {
      toast.error(result.error ?? 'Could not load that URL');
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="url-dialog-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-lg border border-line-strong bg-raised p-0 text-fg backdrop:bg-black/50"
    >
      <form onSubmit={submit} className="flex flex-col gap-3 p-4">
        <h2 id="url-dialog-title" className="text-sm font-semibold">Fetch from URL</h2>
        <p className="text-[13px] text-fg-2">
          The request goes straight from your browser to that address. The server must allow cross-origin requests.
        </p>
        <input
          type="url"
          required
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/data.json"
          aria-label="URL"
          className="h-[30px] rounded-md border border-line-strong bg-bg px-2.5 text-[13px] outline-none focus:border-primary"
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading…' : 'Fetch'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function Header() {
  const { undo, redo, canUndo, canRedo, loadSample, clearAll } = useEditorStore();
  const urlDialog = useRef<HTMLDialogElement>(null);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line pr-3 pl-4">
      <Logo />
      <div className="flex-1" />
      <TokenChip />
      <div className="mx-1 hidden h-5 w-px bg-line-strong sm:block" />
      <button type="button" className="btn btn-icon" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
        <Undo2 />
      </button>
      <button type="button" className="btn btn-icon" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Y)">
        <Redo2 />
      </button>
      <Menu
        label="More actions"
        align="end"
        width={200}
        trigger={(props) => (
          <button type="button" className="btn btn-icon" aria-label="More actions" {...props}>
            <MoreHorizontal />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem onSelect={() => { loadSample(); close(); }}>Load sample</MenuItem>
            <MenuItem onSelect={() => { close(); urlDialog.current?.showModal(); }}>Fetch from URL…</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => { clearAll(); close(); }}>Clear input</MenuItem>
          </>
        )}
      </Menu>
      <div className="mx-1 h-5 w-px bg-line-strong" />
      <a
        className="btn btn-icon"
        href="https://github.com/sentry007/Braces_Proto"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub repository"
      >
        <Github />
      </a>
      <ThemeButton />
      <UrlDialog dialog={urlDialog} />
    </header>
  );
}
