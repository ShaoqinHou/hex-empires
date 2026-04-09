export interface CivicDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number; // culture points needed
  readonly prerequisites: ReadonlyArray<string>;
  readonly unlocks: ReadonlyArray<string>; // buildings/abilities unlocked
  readonly description: string;
  readonly treePosition: { readonly row: number; readonly col: number };
}
