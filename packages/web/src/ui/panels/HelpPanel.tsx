import { PanelShell } from './PanelShell';
import type { PanelId } from './panelRegistry';

interface HelpPanelProps {
  onClose: () => void;
}

interface Section {
  title: string;
  icon: string;
  items: Array<{ key?: string; label: string }>;
}

const PANEL_ID: PanelId = 'help';

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
      { key: 'R', label: 'Toggle religion panel (pantheon, religion, faith)' },
      { key: 'G', label: 'Toggle government panel (policies, slots)' },
      { key: 'K', label: 'Toggle commanders panel (XP, level, promotions)' },
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
    <PanelShell id={PANEL_ID} title="Help & Tutorial" onClose={onClose} priority="overlay">
      <div className="flex flex-col gap-6">
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
    </PanelShell>
  );
}
