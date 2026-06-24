export class ImmutableMap<K, V> {
  #map: ReadonlyMap<K, V>;

  constructor(map: Iterable<[K, V]> = []) {
    this.#map = new Map(map);
  }

  get(key: K) {
    return this.#map.get(key);
  }

  has(key: K) {
    return this.#map.has(key);
  }

  set(key: K, value: V) {
    const newMap = new Map(this.#map);
    newMap.set(key, value);
    return new ImmutableMap(newMap);
  }

  entries() {
    return this.#map.entries();
  }

  merge(other: ImmutableMap<K, V>) {
    return new ImmutableMap([...this.#map, ...other.#map]);
  }
}
