import { useState, useRef } from 'react';
import {
  Upload,
  Link,
  CheckCircle,
  FileCode,
  Download,
  Sparkles,
  ArrowRightLeft,
  Minimize2,
  Code2,
  Table,
  CheckCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '../lib/store';
import { validateJSON, formatJSON, minifyJSON } from '@braces/core';
import { downloadFile, uploadFile, loadFromURL } from '../lib/file-handler';
import type { IndentSize, ConversionFormat, GeneratorType } from '../types/index.js';

export function ControlPanel() {
  const {
    inputContent,
    indentSize,
    inputFormat,
    outputTarget,
    isAutoSync,
    setOutputTarget,
    setInputFormat,
    setIndentSize,
    setError,
    setInputContent,
    repairInput,
    toggleAutoSync,
  } = useEditorStore();

  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleValidate = () => {
    const result = validateJSON(inputContent);
    if (result.isValid) {
      toast.success('Valid JSON syntax!');
      setError(null);
    } else {
      const message = result.error
        ? `${result.error.message}${
            result.error.line ? ` (Line ${result.error.line}, Col ${result.error.column || 1})` : ''
          }`
        : 'Invalid JSON';
      toast.error(message);
      setError(message);
    }
  };

  const handleFormat = () => {
    try {
      const formatted = formatJSON(inputContent, indentSize);
      setInputContent(formatted);
      toast.success('Input JSON formatted & beautified!');
    } catch {
      toast.error('Failed to format: Invalid JSON');
    }
  };

  const handleMinify = () => {
    try {
      const minified = minifyJSON(inputContent);
      setInputContent(minified);
      toast.success('Input JSON minified!');
    } catch {
      toast.error('Failed to minify: Invalid JSON');
    }
  };

  const handleRepair = () => {
    const result = repairInput();
    if (result.success) {
      toast.success('JSON Auto-Repaired (100% Local)!', {
        description: result.fixes.join(' • '),
      });
    } else {
      toast.error('Auto-repair could not resolve all syntax errors');
    }
  };

  const handleSelectFormat = (format: ConversionFormat) => {
    setOutputTarget({ kind: 'format', format });
    toast.success(`Active Output ➔ ${format.toUpperCase()}`);
  };

  const handleSelectGenerator = (generator: GeneratorType) => {
    setOutputTarget({ kind: 'generator', generator });
    toast.success(`Active Output ➔ ${generator.toUpperCase()}`);
  };

  const handleDownload = () => {
    if (!inputContent) {
      toast.error('Nothing to download');
      return;
    }
    try {
      downloadFile(inputContent, 'data.json');
      toast.success('Downloaded input data.json!');
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result.success && result.content) {
      useEditorStore.getState().setInputContent(result.content);
      toast.success('File loaded successfully!');
    } else {
      toast.error(result.error || 'Failed to load file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadURL = async () => {
    if (!url) {
      toast.error('Please enter a valid URL');
      return;
    }

    const result = await loadFromURL(url);
    if (result.success && result.content) {
      useEditorStore.getState().setInputContent(result.content);
      toast.success('Loaded data from URL!');
      setShowUrlDialog(false);
      setUrl('');
    } else {
      toast.error(result.error || 'Failed to load URL');
    }
  };

  const isTargetFormat = (f: ConversionFormat) =>
    outputTarget.kind === 'format' && outputTarget.format === f;

  const isTargetGen = (g: GeneratorType) =>
    outputTarget.kind === 'generator' && outputTarget.generator === g;

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/90 border border-gray-800 rounded-xl text-gray-200 text-xs select-none shadow-md">
      {/* 1. Input Source */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          Input Source
        </h4>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.xml,.csv,.yaml,.yml,.toml,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-700 transition-colors font-medium"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            Upload File
          </button>

          <button
            onClick={() => setShowUrlDialog(!showUrlDialog)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-700 transition-colors font-medium"
          >
            <Link className="w-3.5 h-3.5 text-purple-400" />
            Fetch URL
          </button>
        </div>

        {showUrlDialog && (
          <div className="flex flex-col gap-2 p-2.5 mt-2 bg-gray-800/90 border border-gray-700 rounded-lg">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/data.json"
              className="px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleLoadURL}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
            >
              Fetch Payload
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800/80" />

      {/* 2. Format, Clean & Repair */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Format & Clean
        </h4>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleValidate}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors shadow-sm shadow-emerald-600/20"
          >
            <CheckCheck className="w-4 h-4" />
            Validate Syntax
          </button>

          <div className="flex items-center justify-between gap-2 px-1">
            <label className="text-gray-400 text-[11px]">Indent Spacing:</label>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value) as IndentSize)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={2}>2 spaces</option>
              <option value={3}>3 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleFormat}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              Format
            </button>

            <button
              onClick={handleMinify}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Minify
            </button>
          </div>

          <button
            onClick={handleRepair}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all shadow-sm shadow-indigo-500/20"
            title="Auto-Repair JSON syntax errors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Auto-Repair JSON</span>
          </button>
        </div>
      </div>

      <div className="border-t border-gray-800/80" />

      {/* 3. Polyglot Conversions (Real-Time Live Target) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            Conversions
          </h4>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <span>From:</span>
            <select
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value as ConversionFormat)}
              className="bg-gray-800 border border-gray-700 text-blue-400 font-semibold rounded px-1.5 py-0.5"
            >
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
              <option value="yaml">YAML</option>
              <option value="toml">TOML</option>
              <option value="toon">TOON</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectFormat('xml')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all font-mono text-xs ${
              isTargetFormat('xml')
                ? 'bg-orange-600 text-white border-orange-500 font-bold shadow-sm shadow-orange-600/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-orange-500 hover:text-white'
            }`}
          >
            ➔ XML
          </button>
          <button
            onClick={() => handleSelectFormat('csv')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all font-mono text-xs ${
              isTargetFormat('csv')
                ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-sm shadow-emerald-600/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-emerald-500 hover:text-white'
            }`}
          >
            ➔ CSV
          </button>
          <button
            onClick={() => handleSelectFormat('yaml')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all font-mono text-xs ${
              isTargetFormat('yaml')
                ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm shadow-blue-600/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-blue-500 hover:text-white'
            }`}
          >
            ➔ YAML
          </button>
          <button
            onClick={() => handleSelectFormat('toml')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all font-mono text-xs ${
              isTargetFormat('toml')
                ? 'bg-amber-600 text-white border-amber-500 font-bold shadow-sm shadow-amber-600/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-amber-500 hover:text-white'
            }`}
          >
            ➔ TOML
          </button>
          <button
            onClick={() => handleSelectFormat('toon')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all font-mono text-xs font-semibold ${
              isTargetFormat('toon')
                ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-sm shadow-indigo-600/40'
                : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900 hover:text-white'
            }`}
          >
            ➔ TOON (LLM)
          </button>
          <button
            onClick={() => handleSelectFormat('json')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all font-mono text-xs ${
              isTargetFormat('json')
                ? 'bg-teal-600 text-white border-teal-500 font-bold shadow-sm shadow-teal-600/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-teal-500 hover:text-white'
            }`}
          >
            ➔ JSON
          </button>
        </div>
      </div>

      <div className="border-t border-gray-800/80" />

      {/* 4. Code & Schema Generators */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          Code Generators
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectGenerator('typescript')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-medium ${
              isTargetGen('typescript')
                ? 'bg-blue-600 text-white border-blue-400 font-semibold shadow-sm'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-blue-500 hover:text-white'
            }`}
          >
            TypeScript Types
          </button>
          <button
            onClick={() => handleSelectGenerator('zod')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-medium ${
              isTargetGen('zod')
                ? 'bg-indigo-600 text-white border-indigo-400 font-semibold shadow-sm'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-indigo-500 hover:text-white'
            }`}
          >
            Zod Schema
          </button>
          <button
            onClick={() => handleSelectGenerator('json-schema')}
            className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-medium ${
              isTargetGen('json-schema')
                ? 'bg-purple-600 text-white border-purple-400 font-semibold shadow-sm'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-purple-500 hover:text-white'
            }`}
          >
            JSON Schema
          </button>
          <button
            onClick={() => handleSelectGenerator('markdown-table')}
            className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-medium ${
              isTargetGen('markdown-table')
                ? 'bg-teal-600 text-white border-teal-400 font-semibold shadow-sm'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-teal-500 hover:text-white'
            }`}
          >
            <Table className="w-3 h-3" />
            Markdown
          </button>
        </div>
      </div>

      <div className="border-t border-gray-800/80" />

      {/* 5. Live Auto-Sync & Download */}
      <div className="flex flex-col gap-2">
        <button
          onClick={toggleAutoSync}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-[11px] transition-colors ${
            isAutoSync
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
              : 'bg-gray-800 text-gray-400 border-gray-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${isAutoSync ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
            Live Reactive Output
          </span>
          <span className="font-semibold">{isAutoSync ? 'LIVE ON' : 'PAUSED'}</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-teal-400" />
          Download JSON
        </button>
      </div>
    </div>
  );
}
