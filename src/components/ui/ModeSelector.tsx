import type { EditorMode } from '../../types/index.js';

interface ModeSelectorProps {
  currentMode: EditorMode;
  onChange: (mode: EditorMode) => void;
  label?: string;
}

const modes: { value: EditorMode; label: string; description: string }[] = [
  { value: 'code', label: 'Code', description: 'Code editor with syntax highlighting' },
  { value: 'tree', label: 'Tree', description: 'Interactive tree view' },
  { value: 'form', label: 'Form', description: 'Form-based editor' },
  { value: 'text', label: 'Text', description: 'Plain text editor' },
  { value: 'view', label: 'View', description: 'Read-only tree view' },
  { value: 'preview', label: 'Preview', description: 'Formatted preview' },
];

export function ModeSelector({ currentMode, onChange, label }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-400">{label}:</span>}
      <select
        value={currentMode}
        onChange={(e) => onChange(e.target.value as EditorMode)}
        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        {modes.map((mode) => (
          <option key={mode.value} value={mode.value} title={mode.description}>
            {mode.label}
          </option>
        ))}
      </select>
    </div>
  );
}
