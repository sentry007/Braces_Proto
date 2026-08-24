import { useState, useMemo } from 'react';
import { Plus, Trash2, PlusCircle, Check, X, FileEdit } from 'lucide-react';
import { parseJSON } from '@braces/core';
import { useEditorStore } from '../../lib/store';

interface FormEditorProps {
  value: string;
  readOnly?: boolean;
}

type JSONContainer = Record<string, unknown> | unknown[];

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

let keyCounter = 1;
function generateUniqueKey(prefix: string = 'field'): string {
  return `${prefix}_${keyCounter++}`;
}

export function FormEditor({ value, readOnly = false }: FormEditorProps) {
  const { setInputContent, indentSize } = useEditorStore();
  const data = useMemo(() => parseJSON(value), [value]);
  const [addingKeyToPath, setAddingKeyToPath] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');

  const updateRoot = (newData: unknown) => {
    if (!readOnly) {
      setInputContent(JSON.stringify(newData, null, indentSize));
    }
  };

  if (data === null || data === undefined || typeof data !== 'object') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-900/50">
        <FileEdit className="w-12 h-12 text-gray-500 mb-3" />
        <p className="text-gray-400 font-medium">Form Editor requires a JSON Object or Array</p>
        <p className="text-xs text-gray-500 mt-1">Please provide valid structured JSON in Code mode.</p>
      </div>
    );
  }

  const handleFieldChange = (path: (string | number)[], newVal: unknown) => {
    if (readOnly) return;
    const clone = cloneDeep(data) as JSONContainer;
    let curr: Record<string, unknown> | unknown[] = clone;
    for (let i = 0; i < path.length - 1; i++) {
      curr = (curr as Record<string | number, unknown>)[path[i]] as JSONContainer;
    }
    const last = path[path.length - 1];
    (curr as Record<string | number, unknown>)[last] = newVal;
    updateRoot(clone);
  };

  const handleDeleteField = (path: (string | number)[]) => {
    if (readOnly) return;
    const clone = cloneDeep(data) as JSONContainer;
    let curr: Record<string, unknown> | unknown[] = clone;
    for (let i = 0; i < path.length - 1; i++) {
      curr = (curr as Record<string | number, unknown>)[path[i]] as JSONContainer;
    }
    const last = path[path.length - 1];
    if (Array.isArray(curr)) {
      curr.splice(Number(last), 1);
    } else {
      delete (curr as Record<string, unknown>)[String(last)];
    }
    updateRoot(clone);
  };

  const handleAddField = (path: (string | number)[], isArray: boolean) => {
    if (readOnly) return;
    const clone = cloneDeep(data) as JSONContainer;
    let curr: Record<string, unknown> | unknown[] = clone;
    for (const p of path) {
      curr = (curr as Record<string | number, unknown>)[p] as JSONContainer;
    }
    if (isArray && Array.isArray(curr)) {
      curr.push('new_item');
    } else if (!Array.isArray(curr) && typeof curr === 'object' && curr !== null) {
      const key = newKeyName.trim() || generateUniqueKey('field');
      (curr as Record<string, unknown>)[key] = 'value';
    }
    updateRoot(clone);
    setAddingKeyToPath(null);
    setNewKeyName('');
  };

  const renderFieldNode = (
    keyOrIndex: string | number,
    val: unknown,
    path: (string | number)[],
    isParentArray: boolean
  ) => {
    const fieldPath = [...path, keyOrIndex];
    const pathString = fieldPath.join('.');
    const isObject = typeof val === 'object' && val !== null && !Array.isArray(val);
    const isArray = Array.isArray(val);

    if (isObject) {
      return (
        <div key={pathString} className="mb-4 bg-gray-800/40 border border-gray-700/60 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 border-b border-gray-700/40 pb-2">
            <span className="text-sm font-semibold text-blue-400 flex items-center gap-2">
              📂 {String(keyOrIndex)}
              <span className="text-[11px] font-normal text-gray-500">
                ({Object.keys(val as Record<string, unknown>).length} properties)
              </span>
            </span>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddingKeyToPath(pathString)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 bg-blue-950/60 border border-blue-800 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Field
                </button>
                <button
                  onClick={() => handleDeleteField(fieldPath)}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                  title="Delete object"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {addingKeyToPath === pathString && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-gray-900/90 rounded border border-blue-500/50">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Field name..."
                autoFocus
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500 flex-1"
              />
              <button
                onClick={() => handleAddField(fieldPath, false)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Save
              </button>
              <button
                onClick={() => {
                  setAddingKeyToPath(null);
                  setNewKeyName('');
                }}
                className="p-1 text-gray-400 hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            {Object.entries(val as Record<string, unknown>).map(([k, v]) =>
              renderFieldNode(k, v, fieldPath, false)
            )}
          </div>
        </div>
      );
    }

    if (isArray) {
      return (
        <div key={pathString} className="mb-4 bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 border-b border-gray-700/40 pb-2">
            <span className="text-sm font-semibold text-purple-400 flex items-center gap-2">
              📋 {String(keyOrIndex)}
              <span className="text-[11px] font-normal text-gray-500">
                ({(val as unknown[]).length} items)
              </span>
            </span>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddField(fieldPath, true)}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium px-2 py-0.5 bg-purple-950/60 border border-purple-800 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" /> Append Item
                </button>
                <button
                  onClick={() => handleDeleteField(fieldPath)}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {(val as unknown[]).map((item, idx) => renderFieldNode(idx, item, fieldPath, true))}
          </div>
        </div>
      );
    }

    const valType = typeof val;

    return (
      <div
        key={pathString}
        className="flex items-center gap-3 p-2 bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-md transition-colors"
      >
        <div className="w-1/3 flex items-center gap-1.5 overflow-hidden">
          <span
            className={`text-xs font-mono font-medium truncate ${
              isParentArray ? 'text-purple-400' : 'text-blue-300'
            }`}
          >
            {isParentArray ? `[${keyOrIndex}]` : String(keyOrIndex)}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {val === null ? 'null' : valType}
          </span>
        </div>

        <div className="flex-1">
          {valType === 'boolean' ? (
            <button
              disabled={readOnly}
              onClick={() => handleFieldChange(fieldPath, !val)}
              className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${
                val
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                  : 'bg-rose-950/80 text-rose-400 border-rose-800 hover:bg-rose-900'
              }`}
            >
              {String(val)}
            </button>
          ) : val === null ? (
            <span className="text-xs text-gray-500 italic">null</span>
          ) : (
            <input
              type={valType === 'number' ? 'number' : 'text'}
              value={String(val ?? '')}
              readOnly={readOnly}
              onChange={(e) => {
                const updated =
                  valType === 'number'
                    ? isNaN(Number(e.target.value))
                      ? 0
                      : Number(e.target.value)
                    : e.target.value;
                handleFieldChange(fieldPath, updated);
              }}
              className="w-full px-2.5 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          )}
        </div>

        {!readOnly && (
          <button
            onClick={() => handleDeleteField(fieldPath)}
            className="text-gray-500 hover:text-red-400 p-1 transition-colors"
            title="Delete field"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-gray-900/90 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Interactive Form Editor</h3>
          <p className="text-xs text-gray-400">Live schema-aware two-way reactive property editor</p>
        </div>
        {!readOnly && typeof data === 'object' && data !== null && (
          <button
            onClick={() => {
              const clone = cloneDeep(data) as JSONContainer;
              if (Array.isArray(clone)) {
                clone.push('new_item');
              } else {
                const newKey = generateUniqueKey('newField');
                (clone as Record<string, unknown>)[newKey] = 'value';
              }
              updateRoot(clone);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Root Property
          </button>
        )}
      </div>

      <div className="space-y-3">
        {Array.isArray(data)
          ? data.map((item, idx) => renderFieldNode(idx, item, [], true))
          : Object.entries(data as Record<string, unknown>).map(([k, v]) =>
              renderFieldNode(k, v, [], false)
            )}
      </div>
    </div>
  );
}
