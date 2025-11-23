interface PreviewViewProps {
  value: string;
}

export function PreviewView({ value }: PreviewViewProps) {
  return (
    <div className="w-full h-full overflow-auto">
      <pre className="p-4 font-mono text-sm bg-gray-900 text-gray-100 whitespace-pre-wrap break-words">
        {value}
      </pre>
    </div>
  );
}
