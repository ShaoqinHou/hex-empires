export interface TechnologyDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number; // science points needed
  readonly prerequisites: ReadonlyArray<string>;
  readonly unlocks: ReadonlyArray<string>; // unit/building IDs unlocked
  readonly description: string;
  readonly treePosition: { readonly row: number; readonly col: number }; // for UI layout
}
