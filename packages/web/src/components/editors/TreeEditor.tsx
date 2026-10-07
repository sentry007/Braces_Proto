import { createContext, useContext, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Pencil,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';
import { tryParseJSON } from 'bracer';
import { useEditorStore } from '../../lib/store';
import {
  addChild,
  defaultValueFor,
  deleteAtPath,
  duplicateAtPath,
  getType,
  isContainer,
  moveNode,
  moveSibling,
  renameKey,
  setAtPath,
  summarize,
  type JSONPath,
} from '../../lib/json-utils';
import type { JSONValueType } from '../../types';

interface TreeContextValue {
  data: unknown;
  readOnly: boolean;
  search: string;
  collapsed: Set<string>;
  toggle: (pathKey: string) => void;
  expand: (pathKey: string) => void;
  dropTarget: string | null;
  setDropTarget: (id: string | null) => void;
  update: (next: unknown) => void;
  drop: (destParent: JSONPath, index: number, mode: 'before' | 'after' | 'into') => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

function useTree(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error('Tree components must be rendered inside TreeEditor');
  return ctx;
}

// Path of the node being dragged; dataTransfer contents aren't readable during dragover
let dragSource: JSONPath | null = null;

const TYPES: JSONValueType[] = ['string', 'number', 'boolean', 'null', 'object', 'array'];

function DropSlot({ id, parentPath, index, position }: {
  id: string;
  parentPath: JSONPath;
  index: number;
  position: 'before' | 'after';
}) {
  const { readOnly, dropTarget, setDropTarget, drop } = useTree();
  if (readOnly) return null;
  const active = dropTarget === id;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(id);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        if (active) setDropTarget(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        drop(parentPath, index, position);
      }}
      className={`relative ${active ? 'h-3' : 'h-1'}`}
    >
      {active && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-primary" />}
    </div>
  );
}

function ValueEditor({ val, type, path }: { val: unknown; type: JSONValueType; path: JSONPath }) {
  const { data, readOnly, update } = useTree();
  if (type === 'boolean') {
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => update(setAtPath(data, path, !val))}
        className="cursor-pointer rounded px-1.5 py-0.5 font-mono text-syn-keyword hover:bg-hover"
        aria-label={`Toggle value, currently ${String(val)}`}
      >
        {String(val)}
      </button>
    );
  }
  if (type === 'null') return <span className="px-1.5 font-mono text-syn-keyword">null</span>;

  const isNumber = type === 'number';
  return (
    <input
      type={isNumber ? 'number' : 'text'}
      readOnly={readOnly}
      value={String(val)}
      aria-label={`Value of ${String(path[path.length - 1])}`}
      onChange={(e) => {
        const raw = e.target.value;
        update(setAtPath(data, path, isNumber ? (raw === '' || isNaN(Number(raw)) ? 0 : Number(raw)) : raw));
      }}
      className={`h-6 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 font-mono text-[12.5px] outline-none hover:border-line-strong focus:border-primary focus:bg-bg ${
        isNumber ? 'text-syn-number' : 'text-syn-string'
      }`}
    />
  );
}

function KeyLabel({ name, path, editing, setEditing }: {
  name: string | number;
  path: JSONPath;
  editing: boolean;
  setEditing: (editing: boolean) => void;
}) {
  const { data, readOnly, update } = useTree();
  const [draft, setDraft] = useState(String(name));

  if (typeof name === 'number') {
    return <span className="font-mono text-muted">{name}</span>;
  }

  if (editing) {
    const save = () => {
      update(renameKey(data, path, draft.trim()));
      setEditing(false);
    };
    return (
      <input
        autoFocus
        value={draft}
        aria-label="Key name"
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
        className="h-6 w-32 rounded border border-primary bg-bg px-1.5 font-mono text-[12.5px] text-syn-key outline-none"
      />
    );
  }

  return (
    <span
      className="font-mono text-syn-key"
      onDoubleClick={() => {
        if (readOnly) return;
        setDraft(name);
        setEditing(true);
      }}
      title={readOnly ? undefined : 'Double-click to rename'}
    >
      {name}
    </span>
  );
}

function RowButton({ label, onClick, disabled, children }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-6 cursor-pointer items-center justify-center rounded text-muted hover:bg-active hover:text-fg disabled:cursor-default disabled:opacity-30 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

function TreeNode({ name, val, path, index, parentPath, isFirst, isLast }: {
  name?: string | number;
  val: unknown;
  path: JSONPath;
  index: number;
  parentPath: JSONPath;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { data, readOnly, search, collapsed, toggle, expand, dropTarget, setDropTarget, update, drop } = useTree();
  const [renaming, setRenaming] = useState(false);
  const pathKey = path.join('\u0000');
  const type = getType(val);
  const container = isContainer(val);
  const isRoot = path.length === 0;
  const isCollapsed = collapsed.has(pathKey);
  const intoId = `into:${pathKey}`;
  const count = container ? Object.keys(val).length : 0;
  const query = search.trim().toLowerCase();
  const matches =
    query !== '' &&
    (String(name ?? '').toLowerCase().includes(query) ||
      (!container && String(val).toLowerCase().includes(query)));

  const children = container
    ? Array.isArray(val)
      ? val.map((v, i) => [i, v] as const)
      : Object.entries(val)
    : [];

  return (
    <div>
      {!isRoot && isFirst && <DropSlot id={`before:${pathKey}`} parentPath={parentPath} index={index} position="before" />}

      <div
        onDragOver={(e) => {
          if (!container || readOnly) return;
          e.preventDefault();
          e.stopPropagation();
          setDropTarget(intoId);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (dropTarget === intoId) setDropTarget(null);
        }}
        onDrop={(e) => {
          if (!container || readOnly) return;
          e.preventDefault();
          e.stopPropagation();
          drop(path, 0, 'into');
        }}
        className={`rounded-md ${dropTarget === intoId ? 'ring-1 ring-primary' : ''}`}
      >
        <div
          className={`group flex h-7 items-center gap-1.5 rounded-md pr-1.5 text-[12.5px] hover:bg-hover ${
            matches ? 'bg-positive-tint' : ''
          }`}
        >
          {!readOnly && !isRoot ? (
            <span
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                dragSource = path;
                e.dataTransfer.setData('text/plain', JSON.stringify(path));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                dragSource = null;
                setDropTarget(null);
              }}
              className="cursor-grab text-faint group-hover:text-muted active:cursor-grabbing [&_svg]:size-3.5"
              title="Drag to move"
            >
              <GripVertical />
            </span>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {container ? (
            <button
              type="button"
              onClick={() => toggle(pathKey)}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
              aria-expanded={!isCollapsed}
              className="inline-flex cursor-pointer text-muted hover:text-fg [&_svg]:size-3.5"
            >
              {isCollapsed ? <ChevronRight /> : <ChevronDown />}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {isRoot ? (
            <span className="font-mono text-muted">root</span>
          ) : (
            <>
              <KeyLabel name={name!} path={path} editing={renaming} setEditing={setRenaming} />
              <span className="-ml-1 font-mono text-faint">:</span>
            </>
          )}

          {container ? (
            <>
              <span className="font-mono text-muted">{Array.isArray(val) ? `[${count}]` : `{${count}}`}</span>
              {isCollapsed && <span className="ml-1 truncate text-xs text-muted">{summarize(val)}</span>}
            </>
          ) : (
            <ValueEditor val={val} type={type} path={path} />
          )}

          {!readOnly && (
            <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
              {!isRoot && (
                <select
                  value={type}
                  aria-label="Value type"
                  onChange={(e) => update(setAtPath(data, path, defaultValueFor(e.target.value as JSONValueType)))}
                  className="h-6 cursor-pointer rounded border border-line-strong bg-raised px-1 text-[11px] text-fg-2"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
              {container && (
                <RowButton
                  label={Array.isArray(val) ? 'Add item' : 'Add field'}
                  onClick={() => {
                    update(addChild(data, path));
                    expand(pathKey);
                  }}
                >
                  <Plus />
                </RowButton>
              )}
              {!isRoot && (
                <>
                  <RowButton label="Move up" disabled={isFirst} onClick={() => update(moveSibling(data, path, 'up'))}>
                    <ArrowUp />
                  </RowButton>
                  <RowButton label="Move down" disabled={isLast} onClick={() => update(moveSibling(data, path, 'down'))}>
                    <ArrowDown />
                  </RowButton>
                  {typeof name === 'string' && (
                    <RowButton label="Rename key" onClick={() => setRenaming(true)}>
                      <Pencil />
                    </RowButton>
                  )}
                  <RowButton label="Duplicate" onClick={() => update(duplicateAtPath(data, path))}>
                    <Copy />
                  </RowButton>
                  <RowButton label="Delete" onClick={() => update(deleteAtPath(data, path))}>
                    <Trash2 />
                  </RowButton>
                </>
              )}
            </div>
          )}
        </div>

        {container && !isCollapsed && (
          <div className="ml-[22px] border-l border-line pl-2">
            {children.map(([k, v], i) => (
              <TreeNode
                key={k}
                name={k}
                val={v}
                path={[...path, k]}
                index={i}
                parentPath={path}
                isFirst={i === 0}
                isLast={i === children.length - 1}
              />
            ))}
            {count === 0 && <div className="py-1 pl-6 text-xs text-muted">Empty {type}</div>}
          </div>
        )}
      </div>

      {!isRoot && <DropSlot id={`after:${pathKey}`} parentPath={parentPath} index={index} position="after" />}
    </div>
  );
}

/** Every container path in the document, for collapse-all. */
function containerPaths(val: unknown, path: JSONPath = [], out: string[] = []): string[] {
  if (isContainer(val)) {
    if (path.length > 0) out.push(path.join('\u0000'));
    for (const [k, v] of Array.isArray(val) ? val.map((v, i) => [i, v] as const) : Object.entries(val)) {
      containerPaths(v, [...path, k], out);
    }
  }
  return out;
}

export function TreeEditor({ value, readOnly = false }: { value: string; readOnly?: boolean }) {
  const { setInputContent, indentSize } = useEditorStore();
  const parsed = useMemo(() => tryParseJSON(value), [value]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  if (!parsed.ok) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted">
        The tree shows valid JSON. Fix the error in the Code view, or use Repair.
      </div>
    );
  }
  const data = parsed.value;

  const update = (next: unknown) => {
    if (!readOnly && next !== data) setInputContent(JSON.stringify(next, null, indentSize));
  };

  const ctx: TreeContextValue = {
    data,
    readOnly,
    search,
    collapsed,
    dropTarget,
    setDropTarget,
    update,
    toggle: (key) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    expand: (key) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }),
    drop: (destParent, index, mode) => {
      const src = dragSource;
      dragSource = null;
      setDropTarget(null);
      if (src && !readOnly) update(moveNode(data, src, destParent, index, mode));
    },
  };

  return (
    <TreeContext.Provider value={ctx}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
          <label className="flex h-[30px] min-w-0 flex-1 items-center gap-2 rounded-md border border-line-strong bg-bg px-2.5 text-muted focus-within:border-primary">
            <Search className="size-3.5 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter keys and values"
              aria-label="Filter keys and values"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
            />
          </label>
          <button type="button" className="btn btn-ghost h-7 text-xs" onClick={() => setCollapsed(new Set())}>
            Expand all
          </button>
          <button
            type="button"
            className="btn btn-ghost h-7 text-xs"
            onClick={() => setCollapsed(new Set(containerPaths(data)))}
          >
            Collapse all
          </button>
        </div>
        <div className="flex-1 overflow-auto px-2 py-1.5">
          <TreeNode val={data} path={[]} index={0} parentPath={[]} isFirst isLast />
        </div>
      </div>
    </TreeContext.Provider>
  );
}
