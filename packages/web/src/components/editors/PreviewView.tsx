import { useMemo } from 'react';
import { tryParseJSON } from 'bracer';
import { isContainer } from '../../lib/json-utils';

type Row = Record<string, unknown>;

function isRecordArray(val: unknown): val is Row[] {
  return Array.isArray(val) && val.length > 0 && val.every((v) => isContainer(v) && !Array.isArray(v));
}

/** Finds the records to tabulate: the root array, or the first array-of-objects field. */
function findTable(data: unknown): { title?: string; rows: Row[] } | null {
  if (isRecordArray(data)) return { rows: data };
  if (isContainer(data) && !Array.isArray(data)) {
    for (const [key, val] of Object.entries(data)) {
      if (isRecordArray(val)) return { title: key, rows: val };
    }
    return { rows: Object.entries(data).map(([field, value]) => ({ field, value })) };
  }
  return null;
}

function cell(val: unknown): string {
  if (val === null) return 'null';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function PreviewView({ json }: { json: string | null }) {
  const table = useMemo(() => {
    if (!json) return null;
    const parsed = tryParseJSON(json);
    return parsed.ok ? findTable(parsed.value) : null;
  }, [json]);

  if (!table) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted">
        Preview shows JSON objects and arrays of records as a table.
      </div>
    );
  }

  const columns = [...new Set(table.rows.flatMap((r) => Object.keys(r)))];
  return (
    <div className="h-full overflow-auto">
      {table.title && (
        <div className="px-3 pt-2.5 pb-1.5 text-xs text-muted">
          <span className="font-mono text-syn-key">{table.title}</span> · {table.rows.length} rows
        </div>
      )}
      <table className="w-full border-collapse text-left text-[12.5px]">
        <thead className="sticky top-0 bg-surface">
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className="border-b border-line px-3 py-2 font-mono font-medium whitespace-nowrap text-fg-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="hover:bg-hover">
              {columns.map((c) => (
                <td key={c} className="max-w-[320px] truncate border-b border-line px-3 py-1.5 font-mono" title={cell(row[c])}>
                  {c in row ? cell(row[c]) : <span className="text-faint">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
