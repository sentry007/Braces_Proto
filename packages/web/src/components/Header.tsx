import {
  Braces,
  Zap,
  Sun,
  Moon,
  Github,
  RotateCcw,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useEditorStore } from '../lib/store';

export function Header() {
  const {
    isDarkMode,
    tokenStats,
    toggleDarkMode,
    clearAll,
    loadSample,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  return (
    <header className="bg-gray-900/95 backdrop-blur border-b border-gray-800 sticky top-0 z-50 px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 shadow-md shadow-blue-500/20 text-white">
            <Braces className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                Braces Reborn
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono">
                v2.1
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Modern Polyglot JSON Suite & Interactive Schema Workspace
            </p>
          </div>
        </div>

        {/* Live Token Savings Badge */}
        {tokenStats.jsonTokens > 0 && (
          <div className="flex items-center gap-3 px-3.5 py-1.5 bg-gradient-to-r from-purple-950/50 via-indigo-950/50 to-blue-950/50 border border-indigo-500/30 rounded-full shadow-inner text-xs">
            <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Token Economy:</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-gray-300">
                JSON: <strong className="text-white">{tokenStats.jsonTokens}</strong> tok
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-indigo-300">
                TOON: <strong className="text-indigo-200">{tokenStats.toonTokens}</strong> tok
              </span>
              {tokenStats.savedPercent > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold text-[10px]">
                  -{tokenStats.savedPercent}% saved
                </span>
              )}
            </div>
          </div>
        )}

        {/* Global Controls & Theme */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-gray-800/80 border border-gray-700/80 rounded-lg p-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 text-gray-400 hover:text-white disabled:text-gray-600 disabled:hover:bg-transparent rounded transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="h-3.5 w-px bg-gray-700 mx-0.5" />
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 text-gray-400 hover:text-white disabled:text-gray-600 disabled:hover:bg-transparent rounded transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={loadSample}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg text-xs font-medium transition-colors"
            title="Reset to Sample JSON payload"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
            <span>Sample</span>
          </button>

          <button
            onClick={clearAll}
            className="px-3 py-1.5 bg-gray-800 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800 text-gray-400 border border-gray-700 rounded-lg text-xs transition-colors"
            title="Clear all editor content"
          >
            Clear
          </button>

          <div className="h-5 w-px bg-gray-800 mx-1" />

          <a
            href="https://github.com/sentry007/Braces_Proto"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>

          <button
            onClick={toggleDarkMode}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
