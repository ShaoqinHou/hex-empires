// @vitest-environment jsdom
/**
 * TreeView — shared tree component unit tests.
 * No GameProvider needed; TreeView accepts plain props.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TreeView } from '../TreeView';
import type { TreeViewItem } from '../TreeView';

const ITEMS: TreeViewItem[] = [
  {
    id: 'a',
    name: 'Alpha',
    age: 'antiquity',
    cost: 10,
    prerequisites: [],
    unlocks: [],
    description: 'First',
    treePosition: { col: 0, row: 0 },
  },
  {
    id: 'b',
    name: 'Beta',
    age: 'antiquity',
    cost: 20,
    prerequisites: ['a'],
    unlocks: [],
    description: 'Second',
    treePosition: { col: 1, row: 0 },
  },
];

afterEach(() => { cleanup(); });

describe('TreeView', () => {
  it('renders one button per item', () => {
    const { getAllByRole } = render(
      <TreeView
        items={ITEMS}
        researchedIds={new Set()}
        activeId={null}
        activeProgress={0}
        accentColor="var(--color-science)"
        costIcon="⚗"
        onSelect={() => {}}
      />
    );
    const buttons = getAllByRole('button');
    // 2 tree node cards
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('alpha is enabled (no prereqs), beta is disabled (prereq a not researched)', () => {
    const { getByText } = render(
      <TreeView
        items={ITEMS}
        researchedIds={new Set()}
        activeId={null}
        activeProgress={0}
        accentColor="var(--color-science)"
        costIcon="⚗"
        onSelect={() => {}}
      />
    );
    const alphaBtn = getByText('Alpha').closest('button') as HTMLButtonElement;
    const betaBtn = getByText('Beta').closest('button') as HTMLButtonElement;
    expect(alphaBtn.disabled).toBe(false);
    expect(betaBtn.disabled).toBe(true);
  });

  it('calls onSelect with item id when available item clicked', () => {
    const calls: string[] = [];
    const { getByText } = render(
      <TreeView
        items={ITEMS}
        researchedIds={new Set()}
        activeId={null}
        activeProgress={0}
        accentColor="var(--color-science)"
        costIcon="⚗"
        onSelect={(id) => calls.push(id)}
      />
    );
    (getByText('Alpha').closest('button') as HTMLButtonElement).click();
    expect(calls).toEqual(['a']);
  });

  it('does not call onSelect when already-researched item clicked', () => {
    const calls: string[] = [];
    const { getByText } = render(
      <TreeView
        items={ITEMS}
        researchedIds={new Set(['a'])}
        activeId={null}
        activeProgress={0}
        accentColor="var(--color-science)"
        costIcon="⚗"
        onSelect={(id) => calls.push(id)}
      />
    );
    const alphaBtn = getByText('Alpha').closest('button') as HTMLButtonElement;
    expect(alphaBtn.disabled).toBe(true);
    alphaBtn.click();
    expect(calls).toEqual([]);
  });

  it('beta becomes enabled once alpha is researched', () => {
    const { getByText } = render(
      <TreeView
        items={ITEMS}
        researchedIds={new Set(['a'])}
        activeId={null}
        activeProgress={0}
        accentColor="var(--color-science)"
        costIcon="⚗"
        onSelect={() => {}}
      />
    );
    const betaBtn = getByText('Beta').closest('button') as HTMLButtonElement;
    expect(betaBtn.disabled).toBe(false);
  });

  it('shows progress header when activeId is set', () => {
    const { getByText, getAllByText } = render(
      <TreeView
        items={ITEMS}
        researchedIds={new Set()}
        activeId="a"
        activeProgress={5}
        accentColor="var(--color-science)"
        costIcon="⚗"
        onSelect={() => {}}
      />
    );
    expect(getByText('Researching:')).toBeTruthy();
    // 'Alpha' appears in both the progress header and the grid card
    expect(getAllByText('Alpha').length).toBeGreaterThanOrEqual(2);
    expect(getByText('5/10')).toBeTruthy();
  });
});
