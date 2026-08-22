import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  Search,
  FolderPlus,
  FileCode,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { parseJSON } from '../../lib/json-validator';
import { useEditorStore } from '../../lib/store';
import type { JSONValueType } from '../../types/index.js';

interface TreeEditorProps {
  value: string;
  readOnly?: boolean;
}

type JSONContainer = Record<string, unknown> | unknown[];

function getType(val: unknown): JSONValueType {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  const t = typeof val;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'object') return 'object';
  return 'string';
}

function getDefaultValueForType(type: JSONValueType): unknown {
  switch (type) {
    case 'string':
      return 'new_value';
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'null':
      return null;
    case 'object':
      return {};
    case 'array':
      return [];
  }
}

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let keyCounter = 1;
function generateUniqueKey(prefix: string = 'key'): string {
  return `${prefix}_${keyCounter++}`;
}

// AST Mutation Helpers
function setValueAtPath(root: unknown, path: (string | number)[], newValue: unknown): unknown {
  if (path.length === 0) return newValue;
  const clone = cloneDeep(root) as JSONContainer;
  let curr: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]] as Record<string | number, unknown>;
  }
  const last = path[path.length - 1];
  curr[last] = newValue;
  return clone;
}

function deleteAtPath(root: unknown, path: (string | number)[]): unknown {
  if (path.length === 0) return {};
  const clone = cloneDeep(root) as JSONContainer;
  let curr: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]] as Record<string | number, unknown>;
  }
  const last = path[path.length - 1];
  if (Array.isArray(curr)) {
    curr.splice(Number(last), 1);
  } else {
    delete (curr as Record<string, unknown>)[String(last)];
  }
  return clone;
}

function renameKeyAtPath(root: unknown, path: (string | number)[], newKey: string): unknown {
  if (path.length === 0 || !newKey) return root;
  const clone = cloneDeep(root) as JSONContainer;
  let curr: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    curr = curr[path[i]] as Record<string | number, unknown>;
  }
  const oldKey = path[path.length - 1];
  if (typeof oldKey === 'string' && oldKey !== newKey && !Array.isArray(curr) && typeof curr === 'object') {
    const val = (curr as Record<string, unknown>)[oldKey];
    delete (curr as Record<string, unknown>)[oldKey];
    (curr as Record<string, unknown>)[newKey] = val;
  }
  return clone;
}

function moveSibling(root: unknown, path: (string | number)[], direction: 'up' | 'down'): unknown {
  if (path.length === 0) return root;
  const clone = cloneDeep(root) as JSONContainer;
  const parentPath = path.slice(0, -1);
  const currentKey = path[path.length - 1];

  let parent: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
  for (const seg of parentPath) {
    parent = parent[seg] as Record<string | number, unknown>;
  }

  if (Array.isArray(parent)) {
    const idx = Number(currentKey);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < parent.length) {
      const temp = parent[idx];
      parent[idx] = parent[targetIdx];
      parent[targetIdx] = temp;
    }
  } else if (typeof parent === 'object' && parent !== null) {
    const entries = Object.entries(parent);
    const idx = entries.findIndex(([k]) => k === String(currentKey));
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx !== -1 && targetIdx >= 0 && targetIdx < entries.length) {
      const temp = entries[idx];
      entries[idx] = entries[targetIdx];
      entries[targetIdx] = temp;

      for (const k of Object.keys(parent)) {
        delete (parent as Record<string, unknown>)[k];
      }
      for (const [k, v] of entries) {
        (parent as Record<string, unknown>)[k] = v;
      }
    }
  }

  return clone;
}

// Check if path A is an ancestor of path B (prevent dropping parent inside child)
function isAncestorOrSelf(a: (string | number)[], b: (string | number)[]): boolean {
  if (a.length > b.length) return false;
  return a.every((seg, i) => String(seg) === String(b[i]));
}

// Global active drag context to ensure cross-browser dataTransfer reliability
let currentDragSourcePath: (string | number)[] | null = null;

export function TreeEditor({ value, readOnly = false }: TreeEditorProps) {
  const { setInputContent, indentSize } = useEditorStore();
  const data = useMemo(() => parseJSON(value), [value]);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null>(null);

  const updateRoot = (newData: unknown) => {
    if (!readOnly) {
      setInputContent(JSON.stringify(newData, null, indentSize));
    }
  };

  const toggleCollapse = (pathKey: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });
  };

  // Dedicated insertion drop executor
  const handleInsertDrop = (
    destParentPath: (string | number)[],
    targetIndex: number,
    insertMode: 'before' | 'after' | 'into'
  ) => {
    const srcPath = currentDragSourcePath;
    currentDragSourcePath = null;
    setActiveDropTargetId(null);

    if (!srcPath || srcPath.length === 0 || readOnly) return;
    if (isAncestorOrSelf(srcPath, destParentPath)) return;

    try {
      const clone = cloneDeep(data) as JSONContainer;

      // 1. Get and remove source value
      let srcParent: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
      for (let i = 0; i < srcPath.length - 1; i++) {
        srcParent = srcParent[srcPath[i]] as Record<string | number, unknown>;
      }
      const srcKey = srcPath[srcPath.length - 1];
      const srcValue = srcParent[srcKey];

      if (Array.isArray(srcParent)) {
        srcParent.splice(Number(srcKey), 1);
      } else {
        delete (srcParent as Record<string, unknown>)[String(srcKey)];
      }

      // 2. Locate destination parent container
      let destParent: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
      for (const seg of destParentPath) {
        destParent = destParent[seg] as Record<string | number, unknown>;
      }

      // 3. Insert value into destination
      if (Array.isArray(destParent)) {
        let insertAt = targetIndex;
        if (insertMode === 'after') insertAt = targetIndex + 1;
        if (insertMode === 'into') insertAt = destParent.length;
        destParent.splice(Math.max(0, Math.min(insertAt, destParent.length)), 0, srcValue);
      } else if (typeof destParent === 'object' && destParent !== null) {
        const destKey = typeof srcKey === 'string' ? srcKey : generateUniqueKey('key');
        if (insertMode === 'into') {
          (destParent as Record<string, unknown>)[destKey] = srcValue;
        } else {
          // Reorder keys
          const entries = Object.entries(destParent);
          let insertAt = targetIndex;
          if (insertMode === 'after') insertAt = targetIndex + 1;

          entries.splice(Math.max(0, Math.min(insertAt, entries.length)), 0, [destKey, srcValue]);

          for (const k of Object.keys(destParent)) {
            delete (destParent as Record<string, unknown>)[k];
          }
          for (const [k, v] of entries) {
            (destParent as Record<string, unknown>)[k] = v;
          }
        }
      }

      updateRoot(clone);
    } catch {
      // Ignore invalid drag-and-drop operations
    }
  };

  if (data === null || data === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-900/50">
        <FileCode className="w-12 h-12 text-gray-500 mb-3" />
        <p className="text-gray-400 font-medium">Invalid or empty JSON</p>
        <p className="text-xs text-gray-500 mt-1">Provide valid JSON in Code mode to visualize the interactive tree.</p>
      </div>
    );
  }

  // Explicit Drop Zone Line Component
  const DropSlot = ({
    slotId,
    parentPath,
    index,
    position,
  }: {
    slotId: string;
    parentPath: (string | number)[];
    index: number;
    position: 'before' | 'after';
  }) => {
    if (readOnly) return null;
    const isHovered = activeDropTargetId === slotId;

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setActiveDropTargetId(slotId);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (activeDropTargetId === slotId) setActiveDropTargetId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleInsertDrop(parentPath, index, position);
        }}
        className={`relative transition-all ${
          isHovered ? 'h-3.5 my-1' : 'h-1.5'
        }`}
      >
        {isHovered && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center gap-1 z-30 pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
            <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
          </div>
        )}
      </div>
    );
  };

  // Recursive Tree Node Component
  const TreeNode = ({
    name,
    val,
    path,
    index,
    parentPath,
    isFirst,
    isLast,
  }: {
    name?: string | number;
    val: unknown;
    path: (string | number)[];
    index: number;
    parentPath: (string | number)[];
    isFirst: boolean;
    isLast: boolean;
  }) => {
    const pathKey = path.join('.');
    const isCollapsed = collapsedPaths.has(pathKey);
    const type = getType(val);
    const isContainer = type === 'object' || type === 'array';
    const isRoot = path.length === 0;

    const [isEditingKey, setIsEditingKey] = useState(false);
    const [keyDraft, setKeyDraft] = useState(String(name ?? ''));

    const containerSlotId = `into:${pathKey}`;
    const isContainerTarget = activeDropTargetId === containerSlotId;

    const itemCount = isContainer
      ? type === 'array'
        ? (val as unknown[]).length
        : Object.keys(val as Record<string, unknown>).length
      : 0;

    const matchesSearch =
      searchTerm.trim() !== '' &&
      (String(name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(val).toLowerCase().includes(searchTerm.toLowerCase()));

    const handleTypeChange = (newType: JSONValueType) => {
      if (readOnly || newType === type) return;
      const defaultVal = getDefaultValueForType(newType);
      const updated = setValueAtPath(data, path, defaultVal);
      updateRoot(updated);
    };

    const handleValueChange = (newValStr: string) => {
      if (readOnly) return;
      let parsedVal: unknown = newValStr;
      if (type === 'number') {
        const num = Number(newValStr);
        parsedVal = isNaN(num) ? 0 : num;
      } else if (type === 'boolean') {
        parsedVal = newValStr === 'true';
      } else if (type === 'null') {
        parsedVal = null;
      }
      const updated = setValueAtPath(data, path, parsedVal);
      updateRoot(updated);
    };

    const handleAddProperty = (asArrayItem: boolean = false) => {
      if (readOnly) return;
      const clone = cloneDeep(data) as JSONContainer;
      let target: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
      for (const p of path) target = target[p] as Record<string | number, unknown>;

      if (asArrayItem || Array.isArray(target)) {
        if (!Array.isArray(target)) return;
        target.push('new_item');
      } else if (typeof target === 'object' && target !== null) {
        let baseKey = 'newKey';
        let counter = 1;
        while (baseKey in target) {
          baseKey = `newKey_${counter++}`;
        }
        (target as Record<string, unknown>)[baseKey] = 'value';
      }
      updateRoot(clone);
      setCollapsedPaths((prev) => {
        const next = new Set(prev);
        next.delete(pathKey);
        return next;
      });
    };

    const handleDelete = () => {
      if (readOnly || isRoot) return;
      const updated = deleteAtPath(data, path);
      updateRoot(updated);
    };

    const handleDuplicate = () => {
      if (readOnly || isRoot) return;
      const clone = cloneDeep(data) as JSONContainer;
      const pPath = path.slice(0, -1);
      const lastKey = path[path.length - 1];

      let parent: Record<string | number, unknown> = clone as unknown as Record<string | number, unknown>;
      for (const p of pPath) parent = parent[p] as Record<string | number, unknown>;

      if (Array.isArray(parent)) {
        parent.splice(Number(lastKey) + 1, 0, cloneDeep(val));
      } else if (typeof parent === 'object' && parent !== null) {
        const newKey = `${lastKey}_copy`;
        (parent as Record<string, unknown>)[newKey] = cloneDeep(val);
      }
      updateRoot(clone);
    };

    const saveKeyRename = () => {
      if (readOnly || isRoot || !keyDraft.trim()) {
        setIsEditingKey(false);
        return;
      }
      const updated = renameKeyAtPath(data, path, keyDraft.trim());
      updateRoot(updated);
      setIsEditingKey(false);
    };

    return (
      <div className="relative">
        {/* Drop Slot Above Sibling */}
        {!isRoot && isFirst && (
          <DropSlot
            slotId={`before:${pathKey}`}
            parentPath={parentPath}
            index={index}
            position="before"
          />
        )}

        <div
          onDragOver={(e) => {
            if (isContainer && !readOnly) {
              e.preventDefault();
              e.stopPropagation();
              setActiveDropTargetId(containerSlotId);
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (activeDropTargetId === containerSlotId) setActiveDropTargetId(null);
          }}
          onDrop={(e) => {
            if (isContainer && !readOnly) {
              e.preventDefault();
              e.stopPropagation();
              handleInsertDrop(path, 0, 'into');
            }
          }}
          className={`group relative transition-all duration-150 rounded border ${
            isContainerTarget
              ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50'
              : 'border-transparent hover:border-gray-800'
          } ${matchesSearch ? 'bg-amber-500/10' : ''}`}
        >
          <div className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-gray-800/70 text-xs font-mono">
            {/* Drag Handle with Global Handlers */}
            {!readOnly && !isRoot && (
              <div
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  currentDragSourcePath = path;
                  e.dataTransfer.setData('text/plain', JSON.stringify(path));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  currentDragSourcePath = null;
                  setActiveDropTargetId(null);
                }}
                className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-blue-400 p-0.5"
                title="Drag node to reorder or drop inside containers"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Expand/Collapse Toggle */}
            {isContainer ? (
              <button
                onClick={() => toggleCollapse(pathKey)}
                className="p-0.5 text-gray-400 hover:text-white rounded transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}

            {/* Key / Property Name */}
            {!isRoot && (
              <div className="flex items-center gap-1">
                {isEditingKey ? (
                  <div className="flex items-center gap-1 bg-gray-900 px-1 py-0.5 rounded border border-blue-500">
                    <input
                      type="text"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveKeyRename();
                        if (e.key === 'Escape') setIsEditingKey(false);
                      }}
                      autoFocus
                      className="bg-transparent text-blue-300 font-semibold focus:outline-none w-24 text-xs"
                    />
                    <button onClick={saveKeyRename} className="text-green-400 hover:text-green-300">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setIsEditingKey(false)} className="text-red-400 hover:text-red-300">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => !readOnly && typeof name === 'string' && setIsEditingKey(true)}
                    className={`font-semibold cursor-pointer select-none ${
                      typeof name === 'number'
                        ? 'text-purple-400'
                        : 'text-blue-400 hover:underline hover:text-blue-300'
                    }`}
                    title={typeof name === 'string' ? 'Double click to rename key' : undefined}
                  >
                    {typeof name === 'number' ? `[${name}]` : `"${name}"`}:
                  </span>
                )}
              </div>
            )}

            {/* Type Selector Dropdown */}
            {!readOnly && !isRoot && (
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as JSONValueType)}
                className="bg-gray-800 border border-gray-700 text-[10px] text-gray-400 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="string">str</option>
                <option value="number">num</option>
                <option value="boolean">bool</option>
                <option value="null">null</option>
                <option value="object">obj</option>
                <option value="array">arr</option>
              </select>
            )}

            {/* Primitive Value Editor */}
            {!isContainer && (
              <div className="flex-1 max-w-md">
                {type === 'boolean' ? (
                  <button
                    disabled={readOnly}
                    onClick={() => handleValueChange(val ? 'false' : 'true')}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                      val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {String(val)}
                  </button>
                ) : type === 'null' ? (
                  <span className="text-gray-500 italic text-xs">null</span>
                ) : (
                  <input
                    type={type === 'number' ? 'number' : 'text'}
                    readOnly={readOnly}
                    value={String(val ?? '')}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className={`w-full bg-gray-800/80 border border-gray-700/80 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors ${
                      type === 'string' ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  />
                )}
              </div>
            )}

            {/* Container Size Badge */}
            {isContainer && (
              <span className="text-gray-500 text-[11px] font-normal">
                {type === 'array' ? `[${itemCount} items]` : `{${itemCount} keys}`}
              </span>
            )}

            {/* Action Toolbar on Hover */}
            {!readOnly && (
              <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* 1-Click Move Up / Down Buttons */}
                {!isRoot && (
                  <>
                    <button
                      disabled={isFirst}
                      onClick={() => updateRoot(moveSibling(data, path, 'up'))}
                      className="p-1 hover:bg-gray-700 text-gray-400 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-gray-400 rounded transition-colors"
                      title="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={isLast}
                      onClick={() => updateRoot(moveSibling(data, path, 'down'))}
                      className="p-1 hover:bg-gray-700 text-gray-400 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-gray-400 rounded transition-colors"
                      title="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </>
                )}

                {isContainer && (
                  <button
                    onClick={() => handleAddProperty(type === 'array')}
                    className="p-1 hover:bg-gray-700 text-gray-400 hover:text-green-400 rounded transition-colors"
                    title={type === 'array' ? 'Append array item' : 'Add object key'}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
                {!isRoot && (
                  <>
                    {typeof name === 'string' && !isEditingKey && (
                      <button
                        onClick={() => setIsEditingKey(true)}
                        className="p-1 hover:bg-gray-700 text-gray-400 hover:text-blue-400 rounded transition-colors"
                        title="Rename key"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={handleDuplicate}
                      className="p-1 hover:bg-gray-700 text-gray-400 hover:text-purple-400 rounded transition-colors"
                      title="Duplicate node"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded transition-colors"
                      title="Delete node"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Children Render */}
          {isContainer && !isCollapsed && (
            <div className="ml-4 pl-3 border-l border-gray-800/80 space-y-0.5">
              {type === 'array'
                ? (val as unknown[]).map((item, idx, arr) => (
                    <TreeNode
                      key={idx}
                      name={idx}
                      val={item}
                      path={[...path, idx]}
                      index={idx}
                      parentPath={path}
                      isFirst={idx === 0}
                      isLast={idx === arr.length - 1}
                    />
                  ))
                : Object.entries(val as Record<string, unknown>).map(([k, v], idx, arr) => (
                    <TreeNode
                      key={k}
                      name={k}
                      val={v}
                      path={[...path, k]}
                      index={idx}
                      parentPath={path}
                      isFirst={idx === 0}
                      isLast={idx === arr.length - 1}
                    />
                  ))}

              {itemCount === 0 && (
                <div className="py-1 text-xs text-gray-600 italic">Empty {type}</div>
              )}
            </div>
          )}
        </div>

        {/* Drop Slot Below Sibling */}
        {!isRoot && (
          <DropSlot
            slotId={`after:${pathKey}`}
            parentPath={parentPath}
            index={index}
            position="after"
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/90 text-gray-100 overflow-hidden select-text">
      {/* Tree Search & Quick Action Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/60 border-b border-gray-700/60 gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keys or values..."
            className="w-full pl-8 pr-3 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setCollapsedPaths(new Set())}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 text-[11px] transition-colors"
          >
            Expand All
          </button>
          {!readOnly && typeof data === 'object' && data !== null && (
            <button
              onClick={() => {
                const clone = cloneDeep(data) as JSONContainer;
                if (Array.isArray(clone)) {
                  clone.push('new_item');
                } else {
                  const key = generateUniqueKey('key');
                  (clone as Record<string, unknown>)[key] = 'new_value';
                }
                updateRoot(clone);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-[11px] font-medium transition-colors"
            >
              <FolderPlus className="w-3 h-3" />
              Add Root Field
            </button>
          )}
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-auto p-3 font-mono">
        <TreeNode
          val={data}
          path={[]}
          index={0}
          parentPath={[]}
          isFirst={true}
          isLast={true}
        />
      </div>
    </div>
  );
}
