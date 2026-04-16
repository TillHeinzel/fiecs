import { IStorageArchetype, IStorageEntity, IStoragePair } from "./";
import {
  isWildcard,
  RelationshipWildcard,
  Wildcard,
  WildcardTarget,
  WildcardWildcard,
} from "./Wildcard";

export type Query<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
  T,
> = {
  forEachArchetype(
    callback: (archetype: Archetype, match: Set<T>) => void,
  ): void;
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): Set<T>;
  each(callback: (entity: Entity) => void): void;
};

class NullQuery implements Query<never, never, never, never> {
  forEachArchetype(): void {}

  matches(): boolean {
    return false;
  }

  match(): Set<never> {
    return new Set();
  }

  each(): void {}
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
      | [
          Entity | Wildcard<Archetype, Entity, Pair>,
          Entity | Wildcard<Archetype, Entity, Pair>,
        ],
  ): Query<Archetype, Entity, Pair, Pair>;
  build(
    arg:
      | Wildcard<Archetype, Entity, Pair>
      | Entity
      | Pair
      | [
          Entity | Wildcard<Archetype, Entity, Pair>,
          Entity | Wildcard<Archetype, Entity, Pair>,
        ],
  ):
    | Query<Archetype, Entity, Pair, Entity>
    | Query<Archetype, Entity, Pair, Pair> {
    if (this.isWildcardBothPair(arg)) {
      return new SingleQueryTerm<
        Archetype,
        Entity,
        Pair,
        Pair,
        WildcardWildcard<Archetype, Entity, Pair>
      >(arg[0].doubleWildcard);
    }
    if (this.isWildcardSecondPair(arg)) {
      return new SingleQueryTerm<
        Archetype,
        Entity,
        Pair,
        Pair,
        RelationshipWildcard<Archetype, Entity, Pair>
      >(arg[0].getRelationshipWildcard());
    }
    if (this.isWildcardFirstPair(arg)) {
      return new SingleQueryTerm<
        Archetype,
        Entity,
        Pair,
        Pair,
        WildcardTarget<Archetype, Entity, Pair>
      >(arg[1].getWildcardTarget());
    }
    if (isWildcard(arg)) {
      return new SingleQueryTerm<
        Archetype,
        Entity,
        Pair,
        Entity,
        Wildcard<Archetype, Entity, Pair>
      >(arg);
    }
    if (this.isEntityPair(arg)) {
      const pair = arg[0].lookupPairWith(arg[1]);
      if (pair === undefined) return new NullQuery();
      return new SingleQueryTerm<Archetype, Entity, Pair, Pair, Pair>(pair);
    }
    if (this.isEntity(arg)) {
      return new SingleQueryTerm<Archetype, Entity, Pair, Entity, Entity>(arg);
    }
    if (this.isPair(arg)) {
      return new SingleQueryTerm<Archetype, Entity, Pair, Pair, Pair>(arg);
    }

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

  isEntity(
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

  isPair(
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

  isEntityPair(arg: unknown): arg is [Entity, Entity] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      !isWildcard<Archetype, Entity, Pair>(arg[0]) &&
      !isWildcard<Archetype, Entity, Pair>(arg[1])
    );
  }

  isWildcardFirstPair(
    arg: unknown,
  ): arg is [Wildcard<Archetype, Entity, Pair>, Entity] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      isWildcard<Archetype, Entity, Pair>(arg[0]) &&
      !isWildcard<Archetype, Entity, Pair>(arg[1])
    );
  }

  isWildcardSecondPair(
    arg: unknown,
  ): arg is [Entity, Wildcard<Archetype, Entity, Pair>] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      !isWildcard<Archetype, Entity, Pair>(arg[0]) &&
      isWildcard<Archetype, Entity, Pair>(arg[1])
    );
  }

  isWildcardBothPair(
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

interface IQueryAble<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
  T,
> {
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<T>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]>;
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
    this.term
      .matchingArchetypes()
      .forEach(([archetype, match]) =>
        callback(archetype, match as unknown as Set<T>),
      );
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
