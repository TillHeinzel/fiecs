import { IStorageArchetype, IStorageEntity, IStoragePair } from "./";
import { IQueryAble } from "./IQueryAble";
import { isWildcard, Wildcard } from "./Wildcard";

export type Query<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
  T,
> = {
  forEachArchetype(
    callback: (archetype: Archetype, match: Set<T>) => void,
  ): void;

  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]>;
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): Set<T>;
  each(callback: (entity: Entity) => void): void;
};

class NullQuery implements Query<never, never, never, never> {
  forEachArchetype(): void {}

  matchingArchetypes(): IteratorObject<[never, Set<never>], unknown, unknown> {
    return [][Symbol.iterator]();
  }

  matches(): boolean {
    return false;
  }

  match(): Set<never> {
    return new Set();
  }

  each(): void {}
}

export function mergeResults<Archetype, Entity, Pair>(
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

export class QueryBuilder<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  build(
    arg: Entity | Wildcard<Archetype, Entity, Pair>,
  ): Query<Archetype, Entity, Pair, Entity>;
  build(
    arg:
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard<Archetype, Entity, Pair>]
      | [Wildcard<Archetype, Entity, Pair>, Entity]
      | [Wildcard<Archetype, Entity, Pair>, Wildcard<Archetype, Entity, Pair>],
  ): Query<Archetype, Entity, Pair, Pair>;
  build(
    arg:
      | Wildcard<Archetype, Entity, Pair>
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard<Archetype, Entity, Pair>]
      | [Wildcard<Archetype, Entity, Pair>, Entity]
      | [Wildcard<Archetype, Entity, Pair>, Wildcard<Archetype, Entity, Pair>],
  ):
    | Query<Archetype, Entity, Pair, Entity>
    | Query<Archetype, Entity, Pair, Pair> {
    if (this.isEntity(arg) || isWildcard(arg)) {
      return this.makeMakeTerm<Entity>()(arg);
    }
    if (this.isPair(arg)) {
      return this.makeMakeTerm<Pair>()(arg);
    }
    if (this.isDoubleWildcard(arg)) {
      return this.makeMakeTerm<Pair>()(arg[0].doubleWildcard);
    }
    if (this.isRelationshipWildcard(arg)) {
      return this.makeMakeTerm<Pair>()(arg[0].getRelationshipWildcard());
    }
    if (this.isWildcardTarget(arg)) {
      return this.makeMakeTerm<Pair>()(arg[1].getWildcardTarget());
    }
    if (this.isEntityPair(arg)) {
      const pair = arg[0].lookupPairWith(arg[1]);
      if (pair === undefined) return new NullQuery();
      return this.makeMakeTerm<Pair>()(pair);
    }

    // should be unreachable
    throw new Error("Invalid query argument");
  }

  buildAny(
    arg:
      | Wildcard<Archetype, Entity, Pair>
      | Entity
      | Pair
      | [
          Entity | Wildcard<Archetype, Entity, Pair>,
          Entity | Wildcard<Archetype, Entity, Pair>,
        ],
  ): Query<Archetype, Entity, Pair, Entity | Pair> {
    // @ts-expect-error // type erasure
    return this.build(arg) as Query<Archetype, Entity, Pair, Entity | Pair>;
  }

  private makeMakeTerm<T extends Entity | Pair>() {
    return <Term extends IQueryAble<Archetype, Entity, Pair, T>>(
      term: Term,
    ): SingleQueryTerm<Archetype, Entity, Pair, T, Term> => {
      return new SingleQueryTerm<Archetype, Entity, Pair, T, Term>(term);
    };
  }

  private isEntity(
    arg:
      | Wildcard<Archetype, Entity, Pair>
      | Entity
      | Pair
      | [
          Entity | Wildcard<Archetype, Entity, Pair>,
          Entity | Wildcard<Archetype, Entity, Pair>,
        ],
  ): arg is Entity {
    return typeof arg === "object" && "isEntity" in arg && arg.isEntity();
  }

  private isPair(
    arg:
      | Wildcard<Archetype, Entity, Pair>
      | Entity
      | Pair
      | [
          Entity | Wildcard<Archetype, Entity, Pair>,
          Entity | Wildcard<Archetype, Entity, Pair>,
        ],
  ): arg is Pair {
    return typeof arg === "object" && "isPair" in arg && arg.isPair();
  }

  private isEntityPair(arg: unknown): arg is [Entity, Entity] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      !isWildcard<Archetype, Entity, Pair>(arg[0]) &&
      !isWildcard<Archetype, Entity, Pair>(arg[1])
    );
  }

  private isWildcardTarget(
    arg: unknown,
  ): arg is [Wildcard<Archetype, Entity, Pair>, Entity] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      isWildcard<Archetype, Entity, Pair>(arg[0]) &&
      !isWildcard<Archetype, Entity, Pair>(arg[1])
    );
  }

  private isRelationshipWildcard(
    arg: unknown,
  ): arg is [Entity, Wildcard<Archetype, Entity, Pair>] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      !isWildcard<Archetype, Entity, Pair>(arg[0]) &&
      isWildcard<Archetype, Entity, Pair>(arg[1])
    );
  }

  private isDoubleWildcard(
    arg: unknown,
  ): arg is [
    Wildcard<Archetype, Entity, Pair>,
    Wildcard<Archetype, Entity, Pair>,
  ] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      isWildcard<Archetype, Entity, Pair>(arg[0]) &&
      isWildcard<Archetype, Entity, Pair>(arg[1])
    );
  }
}

class SingleQueryTerm<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
  T extends Entity | Pair,
  Term extends IQueryAble<Archetype, Entity, Pair, T>,
> implements Query<Archetype, Entity, Pair, T> {
  term: Term;

  constructor(id: Term) {
    this.term = id;
  }

  forEachArchetype(
    callback: (archetype: Archetype, match: Set<T>) => void,
  ): void {
    this.matchingArchetypes().forEach(([archetype, match]) =>
      callback(archetype, match as unknown as Set<T>),
    );
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

  each(callback: (entity: Entity) => void): void {
    this.term
      .matchingArchetypes()
      .forEach(([archetype]) => archetype.entities.forEach(callback));
  }
}
