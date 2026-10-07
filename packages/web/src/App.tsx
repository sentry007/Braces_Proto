import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { useEditorStore } from './lib/store';

function App() {
  const { undo, redo, theme } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Let Monaco and text fields keep their own undo stacks
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.monaco-editor')) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex h-full min-h-[560px] flex-col bg-bg text-fg">
      <Header />
      <Toolbar />
      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(320px,1.2fr)_minmax(260px,1fr)] gap-2.5 p-2.5 lg:grid-cols-2 lg:grid-rows-1">
        <InputPane />
        <OutputPane />
      </main>
      <Toaster
        position="bottom-right"
        theme={theme === 'paper' ? 'light' : 'dark'}
        toastOptions={{
          style: {
            background: 'var(--raised)',
            border: '1px solid var(--line-strong)',
            color: 'var(--fg)',
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
    </div>
  );
}

export default App;
