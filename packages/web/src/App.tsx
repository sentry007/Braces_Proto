import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Header } from './components/Header';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { ControlPanel } from './components/ControlPanel';
import { useEditorStore } from './lib/store';
import { CheckCircle2, AlertCircle, Cpu } from 'lucide-react';

function App() {
  const {
    isDarkMode,
    error,
    tokenStats,
    inputFormat,
    outputTarget,
    isAutoSync,
    undo,
    redo,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow native Monaco or input/textarea undo behavior when focused inside them
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('.monaco-editor')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const targetLabel =
    outputTarget.kind === 'format'
      ? outputTarget.format.toUpperCase()
      : outputTarget.generator.toUpperCase();

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900'
    }`}>
      {/* Header Bar */}
      <Header />

      {/* Main Workspace */}
      <main className="flex-1 p-4 lg:p-6 flex flex-col overflow-hidden max-w-[1920px] w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 h-[calc(100vh-140px)] min-h-[500px]">
          {/* Input Pane */}
          <div className="lg:col-span-5 h-full">
            <InputPane />
          </div>

          {/* Control & Transform Panel */}
          <div className="lg:col-span-3 xl:col-span-2 h-full overflow-y-auto pr-1">
            <ControlPanel />
          </div>

          {/* Output Pane */}
          <div className="lg:col-span-4 xl:col-span-5 h-full">
            <OutputPane />
          </div>
        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="bg-gray-900/90 border-t border-gray-800 px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-4 text-gray-400 font-mono select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {error ? (
              <span className="flex items-center gap-1 text-red-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Syntax Error
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valid JSON
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
            <span>Pipeline:</span>
            <span className="px-1.5 py-0.5 bg-gray-800 rounded font-semibold text-gray-300 uppercase">
              {inputFormat} ➔ {targetLabel}
            </span>
            {isAutoSync && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Real-Time
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1 text-indigo-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Tokens: {tokenStats.jsonTokens} JSON / {tokenStats.toonTokens} TOON</span>
          </div>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <span className="text-gray-400 hidden sm:inline">Braces Reborn v2.1</span>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster position="bottom-right" theme={isDarkMode ? 'dark' : 'light'} richColors closeButton />
    </div>
  );
}

export default App;
