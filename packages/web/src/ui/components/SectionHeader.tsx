// Small utility: uppercase tracking-wider section label, optional icon.

interface SectionHeaderProps {
  readonly title: string;
  readonly icon?: string;
}

export function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <h3
      className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"
      style={{ color: 'var(--color-text-muted)' }}
    >
      {icon && <span>{icon}</span>}
      <span>{title}</span>
    </h3>
  );
}
