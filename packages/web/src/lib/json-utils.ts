/**
 * Immutable helpers for editing parsed JSON by path. Shared by the tree and
 * form editors; every mutation returns a new root and leaves the input intact.
 */
import type { JSONValueType } from '../types';

export type JSONPath = (string | number)[];
type Container = Record<string | number, unknown>;

export function getType(val: unknown): JSONValueType {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  switch (typeof val) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

export function isContainer(val: unknown): val is Container {
  return typeof val === 'object' && val !== null;
}

export function defaultValueFor(type: JSONValueType): unknown {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'object':
      return {};
    case 'array':
      return [];
  }
}

export function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}

/** First key of the form `base`, `base_1`, `base_2`... not already in `obj`. */
export function uniqueKey(obj: object, base = 'newKey'): string {
  let key = base;
  for (let i = 1; key in obj; i++) key = `${base}_${i}`;
  return key;
}

function walk(root: unknown, path: JSONPath): Container {
  let node = root as Container;
  for (const seg of path) node = node[seg] as Container;
  return node;
}

/** Rebuilds an object's keys in a new order (objects keep insertion order). */
function replaceEntries(obj: Container, entries: [string, unknown][]) {
  for (const k of Object.keys(obj)) delete obj[k];
  for (const [k, v] of entries) obj[k] = v;
}

export function setAtPath(root: unknown, path: JSONPath, value: unknown): unknown {
  if (path.length === 0) return value;
  const clone = cloneDeep(root);
  walk(clone, path.slice(0, -1))[path[path.length - 1]] = value;
  return clone;
}

export function deleteAtPath(root: unknown, path: JSONPath): unknown {
  if (path.length === 0) return root;
  const clone = cloneDeep(root);
  const parent = walk(clone, path.slice(0, -1));
  const last = path[path.length - 1];
  if (Array.isArray(parent)) parent.splice(Number(last), 1);
  else delete parent[last];
  return clone;
}

/** Renames an object key in place, keeping its position among siblings. */
export function renameKey(root: unknown, path: JSONPath, newKey: string): unknown {
  const oldKey = path[path.length - 1];
  if (path.length === 0 || !newKey || typeof oldKey !== 'string' || oldKey === newKey) return root;
  const clone = cloneDeep(root);
  const parent = walk(clone, path.slice(0, -1));
  if (Array.isArray(parent) || newKey in parent) return root;
  replaceEntries(
    parent,
    Object.entries(parent).map(([k, v]) => [k === oldKey ? newKey : k, v])
  );
  return clone;
}

export function moveSibling(root: unknown, path: JSONPath, direction: 'up' | 'down'): unknown {
  if (path.length === 0) return root;
  const clone = cloneDeep(root);
  const parent = walk(clone, path.slice(0, -1));
  const key = path[path.length - 1];
  const delta = direction === 'up' ? -1 : 1;

  if (Array.isArray(parent)) {
    const i = Number(key);
    const j = i + delta;
    if (j < 0 || j >= parent.length) return root;
    [parent[i], parent[j]] = [parent[j], parent[i]];
  } else {
    const entries = Object.entries(parent);
    const i = entries.findIndex(([k]) => k === String(key));
    const j = i + delta;
    if (i === -1 || j < 0 || j >= entries.length) return root;
    [entries[i], entries[j]] = [entries[j], entries[i]];
    replaceEntries(parent, entries);
  }
  return clone;
}

/** Duplicates a node next to itself (array) or under `<key>_copy` (object). */
export function duplicateAtPath(root: unknown, path: JSONPath): unknown {
  if (path.length === 0) return root;
  const clone = cloneDeep(root);
  const parent = walk(clone, path.slice(0, -1));
  const key = path[path.length - 1];
  const copy = cloneDeep(parent[key]);
  if (Array.isArray(parent)) {
    parent.splice(Number(key) + 1, 0, copy);
  } else {
    const entries = Object.entries(parent);
    const i = entries.findIndex(([k]) => k === String(key));
    entries.splice(i + 1, 0, [uniqueKey(parent, `${key}_copy`), copy]);
    replaceEntries(parent, entries);
  }
  return clone;
}

/** Appends an item to an array, or a new key to an object, at `path`. */
export function addChild(root: unknown, path: JSONPath, key?: string): unknown {
  const clone = cloneDeep(root);
  const target = walk(clone, path);
  if (Array.isArray(target)) target.push('');
  else if (isContainer(target)) target[key?.trim() || uniqueKey(target)] = '';
  return clone;
}

export function isAncestorOrSelf(a: JSONPath, b: JSONPath): boolean {
  return a.length <= b.length && a.every((seg, i) => String(seg) === String(b[i]));
}

/**
 * Moves the node at `src` into the container at `destParent`, either at
 * `index` (before/after a sibling) or appended ('into').
 */
export function moveNode(
  root: unknown,
  src: JSONPath,
  destParent: JSONPath,
  index: number,
  mode: 'before' | 'after' | 'into'
): unknown {
  if (src.length === 0 || isAncestorOrSelf(src, destParent)) return root;
  const clone = cloneDeep(root);

  const srcParent = walk(clone, src.slice(0, -1));
  const srcKey = src[src.length - 1];
  const value = srcParent[srcKey];
  const srcIndex = Array.isArray(srcParent)
    ? Number(srcKey)
    : Object.keys(srcParent).indexOf(String(srcKey));
  if (Array.isArray(srcParent)) srcParent.splice(Number(srcKey), 1);
  else delete srcParent[srcKey];

  const dest = walk(clone, destParent);
  let at = mode === 'after' ? index + 1 : index;
  // Removing the source from the same container shifts later positions left
  if (srcParent === dest && srcIndex < at) at -= 1;

  if (Array.isArray(dest)) {
    dest.splice(mode === 'into' ? dest.length : Math.min(at, dest.length), 0, value);
  } else {
    const name = typeof srcKey === 'string' && !(srcKey in dest) ? srcKey : uniqueKey(dest, String(srcKey));
    const entries = Object.entries(dest);
    entries.splice(mode === 'into' ? entries.length : Math.min(at, entries.length), 0, [name, value]);
    replaceEntries(dest, entries);
  }
  return clone;
}

/** Short preview of a record's first primitive values, for collapsed rows. */
export function summarize(val: unknown, max = 3): string {
  if (!isContainer(val)) return '';
  const parts = Object.values(val)
    .filter((v) => v === null || typeof v !== 'object')
    .slice(0, max)
    .map((v) => String(v));
  return parts.join(' · ');
}
