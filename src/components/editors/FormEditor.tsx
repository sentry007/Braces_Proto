import { parseJSON } from '../../lib/json-validator';

interface FormEditorProps {
  value: string;
  readOnly?: boolean;
}

export function FormEditor({ value, readOnly = false }: FormEditorProps) {
  const data = parseJSON(value);

  if (!data || typeof data !== 'object') {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Form editor works best with JSON objects</p>
      </div>
    );
  }

  const renderField = (key: string, val: any, path: string = '') => {
    const fieldPath = path ? `${path}.${key}` : key;

    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return (
        <div key={fieldPath} className="ml-4 mb-4 border-l-2 border-gray-700 pl-4">
          <label className="block text-sm font-semibold text-gray-300 mb-2">{key}</label>
          {Object.entries(val).map(([k, v]) => renderField(k, v, fieldPath))}
        </div>
      );
    }

    return (
      <div key={fieldPath} className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {key}
        </label>
        <input
          type="text"
          value={JSON.stringify(val)}
          readOnly={readOnly}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
        />
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-auto p-4 bg-gray-900">
      <div className="max-w-2xl">
        {Object.entries(data).map(([key, val]) => renderField(key, val))}
      </div>
    </div>
  );
}
