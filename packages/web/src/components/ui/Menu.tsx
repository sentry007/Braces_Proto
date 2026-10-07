import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';

interface MenuProps {
  /** Renders the trigger; spread `props` onto a <button>. */
  trigger: (props: {
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: (e: React.MouseEvent<HTMLElement>) => void;
  }, open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  label: string;
  onOpen?: () => void;
  width?: number;
}

/**
 * Minimal dropdown menu: closes on outside click, Escape, scroll or resize;
 * arrow keys move focus. The list is position: fixed so scrolling containers
 * (like the toolbar on phones) can't clip it.
 */
export function Menu({ trigger, children, align = 'start', label, onOpen, width = 240 }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = (trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();
    const left = align === 'end' ? rect.right - width : rect.left;
    setPos({ top: rect.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>('[aria-haspopup]')?.focus();
      }
    };
    const onScrollOrResize = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    // Focus the checked item (or the first one) when the menu opens
    const items = list.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]');
    const checked = list.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    (checked ?? items?.[0])?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const close = () => setOpen(false);

  return (
    <div ref={root} className="relative">
      {trigger(
        {
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          'aria-controls': id,
          onClick: (e) => {
            if (!open) {
              onOpen?.();
              place(e.currentTarget);
            }
            setOpen(!open);
          },
        },
        open
      )}
      {open && (
        <div
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onListKey}
          style={{ width, top: pos.top, left: pos.left, maxHeight: `calc(100vh - ${pos.top + 8}px)` }}
          className="fixed z-50 overflow-y-auto rounded-lg border border-line-strong bg-raised p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuGroup({ label }: { label: string }) {
  return <div className="px-2 pt-2 pb-1 text-xs text-muted">{label}</div>;
}

export function MenuSeparator() {
  return <div className="mx-0.5 my-1.5 h-px bg-line-strong" role="separator" />;
}

export function MenuItem({
  children,
  onSelect,
  checked,
  hint,
}: {
  children: ReactNode;
  onSelect: () => void;
  checked?: boolean;
  hint?: ReactNode;
}) {
  const radio = checked !== undefined;
  return (
    <button
      type="button"
      role={radio ? 'menuitemradio' : 'menuitem'}
      aria-checked={radio ? checked : undefined}
      onClick={onSelect}
      className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-2 text-left text-[13px] font-medium text-fg outline-none hover:bg-hover focus-visible:bg-hover focus-visible:outline-none aria-checked:text-accent"
    >
      {radio && <span className="flex w-[15px] shrink-0 justify-center">{checked && <Check className="size-[15px]" />}</span>}
      <span className="flex-1 truncate">{children}</span>
      {hint}
    </button>
  );
}
