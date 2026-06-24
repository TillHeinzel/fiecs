export function isImplicitPair(x: unknown): x is [unknown, unknown] {
  return Array.isArray(x) && x.length === 2;
}
