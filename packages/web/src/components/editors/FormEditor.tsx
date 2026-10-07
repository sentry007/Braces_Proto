import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { tryParseJSON } from 'bracer';
import { useEditorStore } from '../../lib/store';
import { addChild, deleteAtPath, isContainer, setAtPath, type JSONPath } from '../../lib/json-utils';

const fieldInput =
  'h-[30px] w-full min-w-0 rounded-md border border-line-strong bg-bg px-2.5 font-mono text-[12.5px] outline-none focus:border-primary';

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="btn btn-icon h-[30px]">
      {children}
    </button>
  );
}

export function FormEditor({ value, readOnly = false }: { value: string; readOnly?: boolean }) {
  const { setInputContent, indentSize } = useEditorStore();
  const parsed = useMemo(() => tryParseJSON(value), [value]);
  const [addingAt, setAddingAt] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');

  if (!parsed.ok || !isContainer(parsed.value)) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted">
        The form shows a valid JSON object or array. Fix the input in the Code view first.
      </div>
    );
  }
  const data = parsed.value;
  const update = (next: unknown) => {
    if (!readOnly) setInputContent(JSON.stringify(next, null, indentSize));
  };

  const renderField = (key: string | number, val: unknown, parent: JSONPath): React.ReactNode => {
    const path = [...parent, key];
    const id = path.join('\u0000');
    const label = typeof key === 'number' ? `Item ${key + 1}` : key;

    if (isContainer(val)) {
      const isArray = Array.isArray(val);
      const entries = isArray ? val.map((v, i) => [i, v] as const) : Object.entries(val);
      return (
        <fieldset key={id} className="rounded-lg border border-line bg-surface">
          <legend className="sr-only">{label}</legend>
          <div className="flex h-10 items-center gap-2 border-b border-line pr-1.5 pl-3">
            <span className="font-medium">{label}</span>
            <span className="font-mono text-xs text-muted">{isArray ? `${entries.length} items` : `${entries.length} fields`}</span>
            {!readOnly && (
              <div className="ml-auto flex items-center">
                <button
                  type="button"
                  className="btn btn-ghost h-7 text-xs"
                  onClick={() => (isArray ? update(addChild(data, path)) : setAddingAt(id))}
                >
                  <Plus />
                  {isArray ? 'Add item' : 'Add field'}
                </button>
                <IconButton label={`Delete ${label}`} onClick={() => update(deleteAtPath(data, path))}>
                  <Trash2 />
                </IconButton>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 p-3">
            {addingAt === id && (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  update(addChild(data, path, newKey));
                  setAddingAt(null);
                  setNewKey('');
                }}
              >
                <input
                  autoFocus
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Field name"
                  aria-label="New field name"
                  className={fieldInput}
                />
                <button type="submit" className="btn btn-primary">Add</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddingAt(null)}>Cancel</button>
              </form>
            )}
            {entries.map(([k, v]) => renderField(k, v, path))}
            {entries.length === 0 && <span className="text-xs text-muted">Empty</span>}
          </div>
        </fieldset>
      );
    }

    const inputId = `field-${id}`;
    return (
      <div key={id} className="grid grid-cols-[minmax(80px,30%)_1fr_auto] items-center gap-3">
        <label htmlFor={inputId} className="truncate font-mono text-[12.5px] text-syn-key">
          {label}
        </label>
        {typeof val === 'boolean' ? (
          <label className="flex h-[30px] items-center gap-2 text-[13px]">
            <input
              id={inputId}
              type="checkbox"
              checked={val}
              disabled={readOnly}
              onChange={() => update(setAtPath(data, path, !val))}
              className="size-4 accent-[var(--primary)]"
            />
            <span className="font-mono text-syn-keyword">{String(val)}</span>
          </label>
        ) : val === null ? (
          <span id={inputId} className="font-mono text-[12.5px] text-syn-keyword">null</span>
        ) : (
          <input
            id={inputId}
            type={typeof val === 'number' ? 'number' : 'text'}
            value={String(val)}
            readOnly={readOnly}
            onChange={(e) => {
              const raw = e.target.value;
              update(setAtPath(data, path, typeof val === 'number' ? (isNaN(Number(raw)) ? 0 : Number(raw)) : raw));
            }}
            className={`${fieldInput} ${typeof val === 'number' ? 'text-syn-number' : 'text-fg'}`}
          />
        )}
        {readOnly ? (
          <span />
        ) : (
          <IconButton label={`Delete ${label}`} onClick={() => update(deleteAtPath(data, path))}>
            <Trash2 />
          </IconButton>
        )}
      </div>
    );
  };

  const rootEntries = Array.isArray(data) ? data.map((v, i) => [i, v] as const) : Object.entries(data);
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {rootEntries.map(([k, v]) => renderField(k, v, []))}
      {!readOnly && (
        <div>
          <button type="button" className="btn btn-ghost" onClick={() => update(addChild(data, []))}>
            <Plus />
            {Array.isArray(data) ? 'Add item' : 'Add field'}
          </button>
        </div>
      )}
    </div>
  );
}
