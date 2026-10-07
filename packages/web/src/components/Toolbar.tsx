import { useRef, useState } from 'react';
import { ArrowRight, ChevronDown, FoldVertical, TextAlignStart, Upload, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { formatJSON, minifyJSON } from 'bracer';
import { useEditorStore } from '../lib/store';
import { uploadFile } from '../lib/file-handler';
import { FORMATS, GENERATORS, formatTokenCounts, targetBadge } from '../lib/formats';
import { Menu, MenuGroup, MenuItem, MenuSeparator } from './ui/Menu';
import type { ConversionFormat, IndentSize } from '../types';

const ACCEPT = '.json,.toon,.yaml,.yml,.toml,.csv,.xml,.txt';

function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange((typeof value === 'number' ? Number(raw) : raw) as T);
        }}
        className="btn appearance-none pr-7"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
    </span>
  );
}

function OutputPicker() {
  const { outputTarget, setOutputTarget, inputJSON } = useEditorStore();
  const [counts, setCounts] = useState<Partial<Record<ConversionFormat, number | null>>>({});
  const values = Object.values(counts).filter((c): c is number => typeof c === 'number');
  const fewest = values.length > 1 ? Math.min(...values) : null;

  return (
    <Menu
      label="Output"
      width={280}
      onOpen={() => setCounts(inputJSON ? formatTokenCounts(inputJSON) : {})}
      trigger={(props) => (
        <button type="button" className="btn gap-2 border-primary pr-2 text-accent" aria-label={`Output: ${targetBadge(outputTarget)}`} {...props}>
          {targetBadge(outputTarget)}
          <ChevronDown className="size-3.5 text-muted" aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuGroup label={values.length ? 'Formats · tokens for this input' : 'Formats'} />
          {FORMATS.map((f) => {
            const count = counts[f.id];
            return (
              <MenuItem
                key={f.id}
                checked={outputTarget.kind === 'format' && outputTarget.format === f.id}
                onSelect={() => {
                  setOutputTarget({ kind: 'format', format: f.id });
                  close();
                }}
                hint={
                  typeof count === 'number' ? (
                    <span className="flex items-center gap-1.5 font-mono text-xs font-normal text-muted">
                      {count === fewest && <span className="font-sans font-medium text-positive-fg">fewest</span>}
                      {count}
                    </span>
                  ) : null
                }
              >
                {f.label}
              </MenuItem>
            );
          })}
          <MenuSeparator />
          <MenuGroup label="Generate code" />
          {GENERATORS.map((g) => (
            <MenuItem
              key={g.id}
              checked={outputTarget.kind === 'generator' && outputTarget.generator === g.id}
              onSelect={() => {
                setOutputTarget({ kind: 'generator', generator: g.id });
                close();
              }}
            >
              {g.label}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

export function Toolbar() {
  const { inputContent, inputFormat, indentSize, setInputFormat, setIndentSize, setInputContent, setInputWithFormat, repairInput } =
    useEditorStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const isJSON = inputFormat === 'json';

  const handleRepair = () => {
    const result = repairInput();
    if (result.success) {
      const changed = result.fixes.filter((f) => f !== 'Validated clean JSON');
      if (changed.length) toast.success('Repaired JSON', { description: changed.join(' · ') });
      else toast.success('Already valid JSON');
    } else {
      toast.error('Could not repair this input', { description: result.error });
    }
  };

  const transformJSON = (fn: (json: string) => string, verb: string) => {
    try {
      setInputContent(fn(inputContent));
    } catch {
      toast.error(`Can't ${verb} invalid JSON. Try Repair first.`);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await uploadFile(file);
    if (result.success && result.content !== undefined) {
      setInputWithFormat(result.content, result.format ?? 'json');
      toast.success(`Opened ${file.name}`);
    } else {
      toast.error(result.error ?? 'Could not open that file');
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="Conversion"
      className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line bg-bar px-4 py-2"
    >
      <span className="text-xs text-muted">From</span>
      <Select
        label="Input format"
        value={inputFormat}
        options={FORMATS.map((f) => ({ value: f.id, label: f.label }))}
        onChange={(v) => setInputFormat(v)}
      />
      <ArrowRight className="size-[15px] shrink-0 text-muted" aria-hidden="true" />
      <span className="text-xs text-muted">To</span>
      <OutputPicker />

      <div className="mx-1 h-5 w-px shrink-0 bg-line-strong" />

      <button type="button" className="btn" onClick={handleRepair} disabled={!isJSON} title={isJSON ? 'Fix broken JSON' : 'Repair works on JSON input'}>
        <Wrench />
        Repair
      </button>
      <button type="button" className="btn" disabled={!isJSON} onClick={() => transformJSON((s) => formatJSON(s, indentSize), 'format')}>
        <TextAlignStart />
        Format
      </button>
      <button type="button" className="btn" disabled={!isJSON} onClick={() => transformJSON(minifyJSON, 'minify')}>
        <FoldVertical />
        Minify
      </button>
      <Select
        label="Indent size"
        value={indentSize}
        options={[2, 3, 4].map((n) => ({ value: n as IndentSize, label: `Indent ${n}` }))}
        onChange={(v) => setIndentSize(v)}
      />

      <div className="min-w-2 flex-1" />

      <input ref={fileInput} type="file" accept={ACCEPT} onChange={handleFile} className="hidden" aria-hidden="true" tabIndex={-1} />
      <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
        <Upload />
        Open file
      </button>
    </div>
  );
}
