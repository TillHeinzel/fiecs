// export class Wildcard<
//   Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
//   Entity extends IStorageEntity<Archetype, Entity, Pair>,
//   Pair extends IStoragePair<Archetype, Entity, Pair>,
// > {
//   _wildcardBrand: undefined = undefined;
//   // archetypes that have this entity as a component
//   backLinksComponent?: Set<Archetype>;
//   // relationships where this entity is the type
//   backLinksRelationship?: Map<Entity, Pair>;
//   // relationships where this entity is the target
//   backLinksTarget?: Map<Entity, Pair>;
// }

import { IStorageArchetype } from "./IArchetype";
import { IStorageEntity } from "./IEntity";
import { IStoragePair } from "./IPair";

abstract class BacklinkQueryable<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
  T extends Entity | Pair,
> {
  protected backlinks: Map<Archetype, Set<T>> = new Map();

  protected abstract checkMatch(archetype: Archetype): IteratorObject<T>;

  addBacklinkIfMatches(archetype: Archetype): void {
    const match = new Set<T>(this.checkMatch(archetype));
    if (match.size > 0) {
      this.backlinks.set(archetype, match);
    }
  }
  removeBacklink(archetype: Archetype): void {
    this.backlinks.delete(archetype);
  }

  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]> {
    return this.backlinks.entries();
  }
  matches(archetype: Archetype): boolean {
    return this.backlinks.has(archetype);
  }
  match(archetype: Archetype): IteratorObject<T> {
    return this.backlinks.get(archetype)?.values() ?? [][Symbol.iterator]();
  }
}

// *
export class Wildcard<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> extends BacklinkQueryable<Archetype, Entity, Pair, Entity> {
  _wildcardBrand: undefined = undefined;

  doubleWildcard = new WildcardWildcard<Archetype, Entity, Pair>();

  protected checkMatch(
    archetype: Archetype,
  ): IteratorObject<Entity, unknown, unknown> {
    return archetype.components
      .keys()
      .filter((component) => component.isEntity());
  }
}

export function isWildcard<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
>(value: unknown): value is Wildcard<Archetype, Entity, Pair> {
  return value instanceof Wildcard;
}

// [*,*]
export class WildcardWildcard<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> extends BacklinkQueryable<Archetype, Entity, Pair, Pair> {
  _doubleWildcardBrand: undefined = undefined;

  protected checkMatch(
    archetype: Archetype,
  ): IteratorObject<Pair, unknown, unknown> {
    return archetype.components
      .keys()
      .filter((component) => component.isPair());
  }
}

export function isWildcardWildcard<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
>(value: unknown): value is WildcardWildcard<Archetype, Entity, Pair> {
  return value instanceof WildcardWildcard;
}

// [relationship, *]
export class RelationshipWildcard<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> extends BacklinkQueryable<Archetype, Entity, Pair, Pair> {
  _relationshipWildcardBrand: undefined = undefined;

  readonly relationship: Entity;

  constructor(relationship: Entity) {
    super();
    this.relationship = relationship;
  }

  private pairsLookup: Map<Entity, Pair> = new Map();
  hasPairs(): boolean {
    return this.pairsLookup.size > 0;
  }
  addPairBacklink(pair: Pair): void {
    this.pairsLookup.set(pair.target, pair);
  }
  lookupTarget(target: Entity): Pair | undefined {
    return this.pairsLookup.get(target);
  }

  protected checkMatch(archetype: Archetype): IteratorObject<Pair> {
    return archetype.components
      .keys()
      .filter((component) => component.isPair())
      .filter((pair) => pair.relationship === this.relationship);
  }
}

export function isRelationshipWildcard<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
>(value: unknown): value is RelationshipWildcard<Archetype, Entity, Pair> {
  return value instanceof RelationshipWildcard;
}

// [*, target]
export class WildcardTarget<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> extends BacklinkQueryable<Archetype, Entity, Pair, Pair> {
  _wildcardTargetBrand: undefined = undefined;

  target: Entity;
  constructor(target: Entity) {
    super();
    this.target = target;
  }

  // private backlinks: Map<Archetype, Set<Pair>> = new Map();

  protected checkMatch(
    archetype: Archetype,
  ): IteratorObject<Pair, unknown, unknown> {
    return archetype.components
      .keys()
      .filter((component) => component.isPair())
      .filter((pair) => pair.target === this.target);
  }
}

export function isWildcardTarget<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
>(value: unknown): value is WildcardTarget<Archetype, Entity, Pair> {
  return value instanceof WildcardTarget;
}
