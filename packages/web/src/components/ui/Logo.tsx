/** The `{bracer}` wordmark: braces in the two brand colors of the active theme. */
export function Logo() {
  return (
    <span className="font-mono text-base leading-none font-semibold tracking-[-0.03em] text-fg" aria-label="Bracer">
      <span className="text-brand-open" aria-hidden="true">{'{'}</span>
      <span aria-hidden="true">bracer</span>
      <span className="text-brand-close" aria-hidden="true">{'}'}</span>
    </span>
  );
}
