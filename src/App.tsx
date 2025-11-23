import { Toaster } from 'sonner';
import { Header } from './components/Header';
import { InputPane } from './components/InputPane';
import { OutputPane } from './components/OutputPane';
import { ControlPanel } from './components/ControlPanel';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />

      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* Input Pane */}
          <div className="lg:col-span-5 h-full">
            <InputPane />
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-2 h-full overflow-y-auto">
            <ControlPanel />
          </div>

          {/* Output Pane */}
          <div className="lg:col-span-5 h-full">
            <OutputPane />
          </div>
        </div>
      </main>

      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;
