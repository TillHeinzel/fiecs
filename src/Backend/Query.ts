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
  forEachArchetype(
    callback: (archetype: Archetype, match: Set<T>) => void,
  ): void;

  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]>;
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): Set<T>;
  each(callback: (entity: Entity) => void): void;
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

  build(
    arg:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ): Query<Entity | Pair> {
    return this.makeTerm(this.componentIndex.getArchetypeMatcher(arg));
  }

  private makeTerm<T extends Entity | Pair>(
    term: IQueryAble<T>,
  ): SingleQueryTerm<T> {
    return new SingleQueryTerm<T>(term);
  }

  private isEntity(
    arg: Wildcard | Entity | Pair | [Entity | Wildcard, Entity | Wildcard],
  ): arg is Entity {
    return typeof arg === "object" && "isEntity" in arg && arg.isEntity();
  }

  private isPair(
    arg: Wildcard | Entity | Pair | [Entity | Wildcard, Entity | Wildcard],
  ): arg is Pair {
    return typeof arg === "object" && "isPair" in arg && arg.isPair();
  }

  private isEntityPair(arg: unknown): arg is [Entity, Entity] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      !isWildcard(arg[0]) &&
      !isWildcard(arg[1])
    );
  }

  private isWildcardTarget(arg: unknown): arg is [Wildcard, Entity] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      isWildcard(arg[0]) &&
      !isWildcard(arg[1])
    );
  }

  private isRelationshipWildcard(arg: unknown): arg is [Entity, Wildcard] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      !isWildcard(arg[0]) &&
      isWildcard(arg[1])
    );
  }

  private isDoubleWildcard(arg: unknown): arg is [Wildcard, Wildcard] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      isWildcard(arg[0]) &&
      isWildcard(arg[1])
    );
  }
}

class SingleQueryTerm<T extends Entity | Pair> implements Query<T> {
  term: IQueryAble<T>;

  constructor(id: IQueryAble<T>) {
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
