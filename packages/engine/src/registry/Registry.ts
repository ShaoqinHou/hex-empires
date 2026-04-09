/** Generic typed registry for game content */
export class Registry<T extends { readonly id: string }> {
  private readonly items: Map<string, T> = new Map();

  register(item: T): void {
    if (this.items.has(item.id)) {
      throw new Error(`Registry: duplicate id "${item.id}"`);
    }
    this.items.set(item.id, item);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  getAll(): ReadonlyArray<T> {
    return Array.from(this.items.values());
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  get size(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }
}
