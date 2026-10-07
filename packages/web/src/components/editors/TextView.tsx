interface TextViewProps {
  value: string;
  onChange: (value: string) => void;
}

/** Plain textarea: lightweight fallback for very large inputs or quick pastes. */
export function TextView({ value, onChange }: TextViewProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Input text"
      spellCheck={false}
      className="h-full w-full resize-none bg-surface px-4 py-2.5 font-mono text-[12.5px] leading-5 text-fg outline-none"
      style={{ tabSize: 2 }}
    />
  );
}
