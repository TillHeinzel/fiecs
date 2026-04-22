import { Archetype, Entity, Pair } from "./BasicObjects";
import { ComponentIndex } from "./ComponentIndex/ComponentIndex";
import {
  Wildcard as GWildcard,
  isWildcard as isGWildcard,
} from "./ComponentIndex/Wildcard";

export type Wildcard = GWildcard<Archetype, Entity, Pair>;

export function isWildcard(value: unknown): value is Wildcard {
  return isGWildcard(value);
}

export interface IQueryAble<T> {
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<T>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]>;
}

export type Query<T> = {
  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]>;
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): Set<T>;
};

export function mergeResults(
  results: (
    | IteratorObject<[Archetype, Set<Entity | Pair>]>
    | IteratorObject<[Archetype, Set<Entity>]>
    | IteratorObject<[Archetype, Set<Pair>]>
  )[],
): Map<Archetype, Set<Entity | Pair>> {
  const merged = new Map<Archetype, Set<Entity | Pair>>();

  for (const result of results) {
    for (const [archetype, matches] of result) {
      if (!merged.has(archetype)) {
        merged.set(archetype, new Set(matches));
      } else {
        const existing = merged.get(archetype)!;
        matches.forEach((match) => existing.add(match));
      }
    }
  }
  return merged;
}

export class QueryBuilder {
  componentIndex: ComponentIndex<Archetype, Entity, Pair>;

  constructor(componentIndex: ComponentIndex<Archetype, Entity, Pair>) {
    this.componentIndex = componentIndex;
  }

  singleTerm(
    arg:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ): Query<Entity | Pair> {
    return new SingleQueryTerm(this.componentIndex.getArchetypeMatcher(arg));
  }
}

class SingleQueryTerm<T extends Entity | Pair> implements Query<T> {
  term: IQueryAble<T>;

  constructor(id: IQueryAble<T>) {
    this.term = id;
  }

  matchingArchetypes(): IteratorObject<[Archetype, Set<T>], unknown, unknown> {
    return this.term.matchingArchetypes();
  }

  matches(archetype: Archetype): boolean {
    return this.term.matches(archetype);
  }

  match(archetype: Archetype): Set<T> {
    return new Set(this.term.match(archetype));
  }
}
