export function* concatIterators<Ts>(...iterators: IteratorObject<Ts>[]) {
  for (const it of iterators) yield* it;
}
