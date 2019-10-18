
export function diffArrays<T>(from: T[] = [], to: T[] = []): { removed: T[], added: T[] } {
  return {
    removed: from.filter(id => !to.includes(id)),
    added: to.filter(id => !from.includes(id))
  };
}
