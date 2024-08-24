export class JSONSet<T> extends Set<T> {
  constructor(iterable?: Iterable<T>) {
    super(iterable);
  }

  toJSON(): T[] {
    return [...this];
  }
}

export const makeId = (): string => {
  const possible = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 5 })
    .map(() => possible.charAt(Math.floor(Math.random() * possible.length)))
    .join('');
};
