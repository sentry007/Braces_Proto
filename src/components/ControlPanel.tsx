import { useEditorStore } from '../lib/store';
import { validateJSON } from '../lib/json-validator';
import { formatJSON, minifyJSON } from '../lib/json-formatter';
import { jsonToXML, jsonToCSV, jsonToYAML, jsonToTOML, jsonToTOON } from '../lib/json-converter';
import { downloadFile, uploadFile, loadFromURL } from '../lib/file-handler';
import type { IndentSize } from '../types/index.js';
import { toast } from 'sonner';
import { useState, useRef } from 'react';

export function ControlPanel() {
  const {
    inputContent,
    indentSize,
    setOutputContent,
    setIndentSize,
    setError,
  } = useEditorStore();

  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleValidate = () => {
    const result = validateJSON(inputContent);
    if (result.isValid) {
      toast.success('Valid JSON!');
      setError(null);
    } else {
      const message = result.error
        ? `${result.error.message}${
            result.error.line ? ` at line ${result.error.line}` : ''
          }`
        : 'Invalid JSON';
      toast.error(message);
      setError(message);
    }
  };

  const handleFormat = () => {
    try {
      const formatted = formatJSON(inputContent, indentSize);
      setOutputContent(formatted);
      toast.success('Formatted successfully!');
    } catch (error) {
      toast.error('Failed to format: Invalid JSON');
    }
  };

  const handleMinify = () => {
    try {
      const minified = minifyJSON(inputContent);
      setOutputContent(minified);
      toast.success('Minified successfully!');
    } catch (error) {
      toast.error('Failed to minify: Invalid JSON');
    }
  };

  const handleConvert = async (format: 'xml' | 'csv' | 'yaml' | 'toml' | 'toon') => {
    try {
      let result: string;
      switch (format) {
        case 'xml':
          result = jsonToXML(inputContent);
          break;
        case 'csv':
          result = jsonToCSV(inputContent);
          break;
        case 'yaml':
          result = jsonToYAML(inputContent);
          break;
        case 'toml':
          result = jsonToTOML(inputContent);
          break;
        case 'toon':
          result = jsonToTOON(inputContent);
          break;
      }
      setOutputContent(result);
      toast.success(`Converted to ${format.toUpperCase()}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to convert to ${format.toUpperCase()}: ${errorMessage}`);
    }
  };

  const handleDownload = () => {
    if (!inputContent) {
      toast.error('Nothing to download');
      return;
    }
    try {
      downloadFile(inputContent, 'data.json');
      toast.success('Downloaded!');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    if (result.success && result.content) {
      useEditorStore.getState().setInputContent(result.content);
      toast.success('File loaded!');
    } else {
      toast.error(result.error || 'Failed to load file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadURL = async () => {
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    const result = await loadFromURL(url);
    if (result.success && result.content) {
      useEditorStore.getState().setInputContent(result.content);
      toast.success('Loaded from URL!');
      setShowUrlDialog(false);
      setUrl('');
    } else {
      toast.error(result.error || 'Failed to load URL');
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-200 mb-2">Actions</h3>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
      >
        Upload File
      </button>

      <button
        onClick={() => setShowUrlDialog(!showUrlDialog)}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
      >
        Load from URL
      </button>

      {showUrlDialog && (
        <div className="flex flex-col gap-2 p-3 bg-gray-900 rounded">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL..."
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleLoadURL}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
          >
            Load
          </button>
        </div>
      )}

      <div className="border-t border-gray-700 my-2"></div>

      <button
        onClick={handleValidate}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm font-medium"
      >
        Validate
      </button>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Indent:</label>
        <select
          value={indentSize}
          onChange={(e) => setIndentSize(Number(e.target.value) as IndentSize)}
          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200"
        >
          <option value={2}>2 spaces</option>
          <option value={3}>3 spaces</option>
          <option value={4}>4 spaces</option>
        </select>
      </div>

      <button
        onClick={handleFormat}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm font-medium"
      >
        Format
      </button>

      <button
        onClick={handleMinify}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm font-medium"
      >
        Minify
      </button>

      <div className="border-t border-gray-700 my-2"></div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-400">Convert to:</span>
        <button
          onClick={() => handleConvert('xml')}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-sm"
        >
          XML
        </button>
        <button
          onClick={() => handleConvert('csv')}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-sm"
        >
          CSV
        </button>
        <button
          onClick={() => handleConvert('yaml')}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-sm"
        >
          YAML
        </button>
        <button
          onClick={() => handleConvert('toml')}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-sm"
        >
          TOML
        </button>
        <button
          onClick={() => handleConvert('toon')}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors text-sm"
        >
          TOON
        </button>
      </div>

      <div className="border-t border-gray-700 my-2"></div>

      <button
        onClick={handleDownload}
        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors text-sm font-medium"
      >
        Download
      </button>
    </div>
  );
}
