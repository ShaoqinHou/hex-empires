interface HelpPanelProps {
  onClose: () => void;
}

interface Section {
  title: string;
  icon: string;
  items: Array<{ key?: string; label: string }>;
}

const SECTIONS: Section[] = [
  {
    title: 'Getting Started',
    icon: '🚀',
    items: [
      { key: 'B', label: 'Found a city with your Settler — select it then press B' },
      { label: 'Set production in your city — click a city, then choose what to build' },
      { key: 'T', label: 'Research technologies — press T to open the tech tree, then click a tech' },
    ],
  },
  {
    title: 'Controls',
    icon: '🎮',
    items: [
      { key: 'Left-click', label: 'Select / cycle units & cities (RTS-style — never moves or attacks)' },
      { key: 'Right-click', label: 'Move selected unit, or attack enemy in range' },
      { key: 'Space', label: 'Cycle through units with moves remaining' },
      { key: 'C', label: 'Jump to capital (opens city panel)' },
      { key: 'N', label: 'Cycle through own cities (opens city panel)' },
      { key: 'Enter', label: 'End turn' },
      { key: 'WASD / Arrows', label: 'Pan camera' },
      { key: 'Scroll', label: 'Zoom in / out' },
      { key: 'T', label: 'Toggle tech tree' },
      { key: 'Y', label: 'Toggle yield overlay' },
      { key: 'F', label: 'Fortify selected unit' },
      { key: 'B', label: 'Found city (with Settler selected)' },
      { key: 'U', label: 'Upgrade selected unit (if tech + gold available)' },
      { key: 'H', label: 'Open / close this help panel' },
      { key: 'Escape', label: 'Deselect unit / close panel' },
    ],
  },
  {
    title: 'Game Concepts',
    icon: '📖',
    items: [
      { label: 'Cities produce units and buildings each turn via a production queue' },
      { label: 'Research techs to unlock new units, buildings, and abilities' },
      { label: 'Gold is earned from trade and cities; spent on unit and building maintenance' },
      { label: 'Happiness affects city growth — keep it positive to grow larger cities' },
      { label: 'Win by Domination (capture all capitals), Science, Culture, or Score' },
    ],
  },
];

export function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{
          width: 'min(640px, 92vw)',
          maxHeight: '80vh',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 100%)',
          }}
        >
          <h2 className="text-xl font-bold">Help &amp; Tutorial</h2>
          <button
            onClick={onClose}
            className="text-xl cursor-pointer px-2 py-0.5 rounded hover:brightness-125 transition-all"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            aria-label="Close help"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3
                className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: 'var(--color-accent)' }}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {item.key ? (
                      <kbd
                        className="shrink-0 text-xs font-mono px-1.5 py-0.5 rounded mt-0.5"
                        style={{
                          backgroundColor: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                          minWidth: '5rem',
                          textAlign: 'center',
                          display: 'inline-block',
                        }}
                      >
                        {item.key}
                      </kbd>
                    ) : (
                      <span
                        className="shrink-0 text-xs mt-0.5"
                        style={{ minWidth: '5rem', color: 'var(--color-text-muted)' }}
                      >
                        •
                      </span>
                    )}
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Footer hint */}
          <p className="text-xs text-center pb-1" style={{ color: 'var(--color-text-muted)' }}>
            Press <kbd className="mx-1 px-1 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>H</kbd>
            at any time to reopen this panel.
          </p>
        </div>
      </div>
    </div>
  );
}
