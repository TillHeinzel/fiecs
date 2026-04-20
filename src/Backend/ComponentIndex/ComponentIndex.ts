import { IArchetype } from "./IArchetype";
import { IEntity } from "./IEntity";
import { IPair } from "./IPair";
import { isWildcard, Wildcard } from "./Wildcard";

export class ComponentIndex<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  wildcard = new Wildcard<Archetype, Entity, Pair>();

  addArchetype(archetype: Archetype): void {
    const components = archetype.components;
    this.wildcard.addBacklinkIfMatches(archetype);
    this.wildcard.doubleWildcard.addBacklinkIfMatches(archetype);
    for (const id of components) {
      id.addBacklink(archetype);
    }
  }

  removeArchetype(archetype: Archetype): void {
    this.wildcard.removeBacklink(archetype);
    this.wildcard.doubleWildcard.removeBacklink(archetype);
    for (const id of archetype.components) {
      id.removeBacklink(archetype);
    }
  }

  getArchetypeMatcher(
    arg:
      | Wildcard<Archetype, Entity, Pair>
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard<Archetype, Entity, Pair>]
      | [Wildcard<Archetype, Entity, Pair>, Entity]
      | [Wildcard<Archetype, Entity, Pair>, Wildcard<Archetype, Entity, Pair>],
  ): ArchetypeMatcher<Archetype, Entity, Pair, Entity | Pair> {
    if (this.isEntity(arg) || isWildcard(arg) || this.isPair(arg)) {
      return arg;
    }
    if (this.isDoubleWildcard(arg)) {
      return arg[0].doubleWildcard;
    }
    if (this.isRelationshipWildcard(arg)) {
      return arg[0].getRelationshipWildcard();
    }
    if (this.isWildcardTarget(arg)) {
      return arg[1].getWildcardTarget();
    }
    if (this.isEntityPair(arg)) {
      const pair = arg[0].lookupPairWith(arg[1]);
      if (pair === undefined) return new NullMatcher();
      return pair;
    }

    // should be unreachable
    throw new Error(`Internal: No matcher for argument ${JSON.stringify(arg)}`);
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
      !isWildcard(arg[0]) &&
      !isWildcard(arg[1])
    );
  }

  private isWildcardTarget(
    arg: unknown,
  ): arg is [Wildcard<Archetype, Entity, Pair>, Entity] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      isWildcard(arg[0]) &&
      !isWildcard(arg[1])
    );
  }

  private isRelationshipWildcard(
    arg: unknown,
  ): arg is [Entity, Wildcard<Archetype, Entity, Pair>] {
    return (
      Array.isArray(arg) &&
      arg.length === 2 &&
      !isWildcard(arg[0]) &&
      isWildcard(arg[1])
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
      isWildcard(arg[0]) &&
      isWildcard(arg[1])
    );
  }
}

export interface ArchetypeMatcher<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
  T extends Entity | Pair,
> {
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<T>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]>;
}

class NullMatcher implements ArchetypeMatcher<never, never, never, never> {
  matches(): boolean {
    return false;
  }
  match(): IteratorObject<never> {
    return [][Symbol.iterator]();
  }
  matchingArchetypes(): IteratorObject<[never, Set<never>]> {
    return [][Symbol.iterator]();
  }
}
