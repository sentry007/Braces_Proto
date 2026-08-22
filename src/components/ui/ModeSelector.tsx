import { Code2, GitFork, LayoutGrid, FileText, Eye, Split } from 'lucide-react';
import type { InputEditorMode, OutputEditorMode } from '../../types/index.js';

interface InputModeSelectorProps {
  currentMode: InputEditorMode;
  onChange: (mode: InputEditorMode) => void;
}

const inputModes: { value: InputEditorMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'code', label: 'Code', icon: Code2 },
  { value: 'tree', label: 'Visual Tree', icon: GitFork },
  { value: 'form', label: 'Form', icon: LayoutGrid },
  { value: 'text', label: 'Text', icon: FileText },
];

export function InputModeSelector({ currentMode, onChange }: InputModeSelectorProps) {
  return (
    <div className="inline-flex p-0.5 bg-gray-900/90 border border-gray-700/80 rounded-lg">
      {inputModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface OutputModeSelectorProps {
  currentMode: OutputEditorMode;
  onChange: (mode: OutputEditorMode) => void;
}

const outputModes: { value: OutputEditorMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'code', label: 'Code', icon: Code2 },
  { value: 'preview', label: 'Preview / Table', icon: Eye },
  { value: 'diff', label: 'Diff View', icon: Split },
];

export function OutputModeSelector({ currentMode, onChange }: OutputModeSelectorProps) {
  return (
    <div className="inline-flex p-0.5 bg-gray-900/90 border border-gray-700/80 rounded-lg">
      {outputModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              isActive
                ? 'bg-purple-600 text-white shadow-sm font-semibold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
