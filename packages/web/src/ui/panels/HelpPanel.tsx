import { useState } from 'react';
import { PanelShell } from './PanelShell';
import type { PanelId } from './panelRegistry';

interface HelpPanelProps {
  onClose: () => void;
}

const PANEL_ID: PanelId = 'help';

type HelpTab = 'controls' | 'concepts' | 'tips';

interface ControlSection {
  title: string;
  icon: string;
  items: Array<{ key?: string; label: string }>;
}

const CONTROL_SECTIONS: ControlSection[] = [
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
      { key: 'Left-click',   label: 'Select / cycle units & cities (never moves or attacks)' },
      { key: 'Right-click',  label: 'Move selected unit, or attack enemy in range' },
      { key: 'Space',        label: 'Cycle through units with moves remaining' },
      { key: 'J',            label: 'Jump to next idle unit; cycles on repeated press' },
      { key: 'C',            label: 'Jump to capital (opens city panel)' },
      { key: 'N',            label: 'Cycle through own cities' },
      { key: 'Enter',        label: 'End turn' },
      { key: 'WASD / ↑↓←→', label: 'Pan camera' },
      { key: 'Scroll',       label: 'Zoom in / out' },
      { key: 'T',            label: 'Toggle tech tree' },
      { key: 'Y',            label: 'Toggle yield overlay' },
      { key: 'F',            label: 'Fortify selected unit' },
      { key: 'B',            label: 'Found city (with Settler selected)' },
      { key: 'U',            label: 'Upgrade selected unit (if tech + gold available)' },
      { key: 'R',            label: 'Toggle religion panel' },
      { key: 'G',            label: 'Toggle government panel' },
      { key: 'K',            label: 'Toggle commanders panel' },
      { key: 'X',            label: 'Toggle trade routes panel' },
      { key: 'H',            label: 'Open / close this help panel' },
      { key: 'Escape',       label: 'Deselect unit / close panel' },
    ],
  },
];

const CONCEPT_ITEMS = [
  'Cities produce units and buildings each turn via a production queue.',
  'Research techs to unlock new units, buildings, and abilities.',
  'Gold is earned from trade and cities; spent on unit and building maintenance.',
  'Happiness affects city growth — keep it positive to grow larger cities.',
  'Win by Domination (capture all capitals), Science, Culture, Economic, or Score.',
  'Legacy bonuses from past governments and ages persist across age transitions.',
  'Civics unlock policies and government forms — keep your civic research active.',
];

interface Tip { icon: string; text: string; }
const TIPS: Tip[] = [
  { icon: '🌾', text: 'Found your first city on grassland or plains near a river for the best early growth.' },
  { icon: '⚔️', text: 'Keep 2–3 warriors near your capital in the early game to fend off barbarians.' },
  { icon: '🔬', text: 'Research Bronze Working or Iron Working early — they unlock powerful military units.' },
  { icon: '🏆', text: 'Technologies that unlock wonders are worth rushing; rivals will compete for them.' },
  { icon: '📊', text: 'Open the Victory Progress panel (V key) to track rival civilizations close to winning.' },
  { icon: '⛪', text: 'A large Faith income from holy cities can build an unstoppable Religion victory engine.' },
  { icon: '💰', text: 'Trade routes generate gold every turn — establish them to your wealthiest cities first.' },
  { icon: '🛡️', text: 'Fortifying units in cities grants +5 combat defense — essential when holding a city.' },
  { icon: '🌅', text: 'Prepare for Age Transitions by pre-building units of the next age before transition fires.' },
  { icon: '🤝', text: 'Declaring Friendship with neighbors reduces war likelihood and can unlock shared bonuses.' },
];

export function HelpPanel({ onClose }: HelpPanelProps) {
  const [activeTab, setActiveTab] = useState<HelpTab>('controls');

  return (
    <PanelShell id={PANEL_ID} title="Help & Tutorial" onClose={onClose} priority="overlay">
      {/* Tab bar */}
      <div
        className="flex gap-0 mb-4"
        style={{ borderBottom: '1px solid var(--panel-border)' }}
        role="tablist"
      >
        {(['controls', 'concepts', 'tips'] as HelpTab[]).map((tab) => {
          const label = tab === 'controls' ? 'Controls' : tab === 'concepts' ? 'Concepts' : 'Tips';
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-2 text-xs transition-colors"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--panel-muted-color)',
                marginBottom: '-1px',
                background: 'none',
                borderTopWidth: '0',
                borderLeftWidth: '0',
                borderRightWidth: '0',
                borderBottomColor: isActive ? 'var(--color-accent)' : 'transparent',
                borderBottomWidth: '2px',
                borderBottomStyle: 'solid',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'controls' && (
        <div className="flex flex-col gap-6" role="tabpanel">
          {CONTROL_SECTIONS.map((section) => (
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
        </div>
      )}

      {activeTab === 'concepts' && (
        <div role="tabpanel">
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-accent)' }}
          >
            <span>📖</span>
            <span>Game Concepts</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {CONCEPT_ITEMS.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span
                  className="shrink-0 text-xs mt-0.5"
                  style={{ minWidth: '1rem', color: 'var(--color-text-muted)' }}
                >
                  •
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="flex flex-col gap-3" role="tabpanel">
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2"
            style={{ color: 'var(--color-accent)' }}
          >
            <span>💡</span>
            <span>Strategy Tips</span>
          </h3>
          {TIPS.map((tip, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2 rounded"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <span className="text-base flex-shrink-0">{tip.icon}</span>
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>{tip.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer hint */}
      <p className="text-xs text-center pb-1 mt-4" style={{ color: 'var(--color-text-muted)' }}>
        Press{' '}
        <kbd
          className="mx-1 px-1 rounded text-xs font-mono"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        >
          H
        </kbd>
        at any time to reopen this panel.
      </p>
    </PanelShell>
  );
}
