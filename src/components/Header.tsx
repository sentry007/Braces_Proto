import { useEditorStore } from '../lib/store';

export function Header() {
  const { isDarkMode, toggleDarkMode, clearAll } = useEditorStore();

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            ⚡ Braces Reborn
          </h1>
          <span className="text-xs text-gray-400 mt-1">
            JSON Formatter & Validator
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={clearAll}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
