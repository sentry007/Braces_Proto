interface TextViewProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function TextView({ value, onChange, readOnly = false }: TextViewProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange && !readOnly) {
      onChange(e.target.value);
    }
  };

  return (
    <textarea
      value={value}
      onChange={handleChange}
      readOnly={readOnly}
      className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
      style={{ tabSize: 2 }}
      spellCheck={false}
    />
  );
}
