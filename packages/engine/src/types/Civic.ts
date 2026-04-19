export interface CivicDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number; // culture points needed
  readonly prerequisites: ReadonlyArray<string>;
  readonly unlocks: ReadonlyArray<string>; // buildings/abilities unlocked
  readonly description: string;
  readonly treePosition: { readonly row: number; readonly col: number };
  /** If set, this civic is only available to the specified civilization. Undefined = universal. */
  readonly civId?: string;
  /**
   * If set, this civic belongs to an ideology branch and is only available
   * after the player selects that ideology via SELECT_IDEOLOGY. Civics from
   * the other two branches are locked out once an ideology is chosen.
   * Only used in the Modern age (W2-03 CT F-08).
   */
  readonly ideologyBranch?: 'democracy' | 'fascism' | 'communism';
}
