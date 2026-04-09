import { describe, it, expect } from 'vitest';
import { Registry } from '../Registry';

interface TestItem {
  readonly id: string;
  readonly value: number;
}

describe('Registry', () => {
  it('registers and retrieves items', () => {
    const reg = new Registry<TestItem>();
    reg.register({ id: 'a', value: 1 });
    expect(reg.get('a')).toEqual({ id: 'a', value: 1 });
  });

  it('returns undefined for missing items', () => {
    const reg = new Registry<TestItem>();
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  it('reports has correctly', () => {
    const reg = new Registry<TestItem>();
    reg.register({ id: 'x', value: 42 });
    expect(reg.has('x')).toBe(true);
    expect(reg.has('y')).toBe(false);
  });

  it('throws on duplicate id', () => {
    const reg = new Registry<TestItem>();
    reg.register({ id: 'dup', value: 1 });
    expect(() => reg.register({ id: 'dup', value: 2 })).toThrow('duplicate id "dup"');
  });

  it('getAll returns all registered items', () => {
    const reg = new Registry<TestItem>();
    reg.register({ id: 'a', value: 1 });
    reg.register({ id: 'b', value: 2 });
    reg.register({ id: 'c', value: 3 });
    expect(reg.getAll()).toHaveLength(3);
    expect(reg.size).toBe(3);
  });

  it('clear removes all items', () => {
    const reg = new Registry<TestItem>();
    reg.register({ id: 'a', value: 1 });
    reg.clear();
    expect(reg.size).toBe(0);
    expect(reg.get('a')).toBeUndefined();
  });
});
