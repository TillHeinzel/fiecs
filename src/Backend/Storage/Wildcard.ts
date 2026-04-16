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

// *
export class Wildcard<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  _wildcardBrand: undefined = undefined;

  doubleWildcard = new WildcardWildcard<Archetype, Entity, Pair>();

  private backlinks: Map<Archetype, Set<Entity>> = new Map();
  maybeAddBacklink(archetype: Archetype): void {
    const pairComponents = new Set<Entity>(
      archetype.components.keys().filter((component) => component.isEntity()),
    );
    if (pairComponents.size > 0) {
      this.backlinks.set(archetype, pairComponents);
    }
  }
  matchingArchetypes(): IteratorObject<[Archetype, Set<Entity>]> {
    return this.backlinks.entries();
  }
  matches(archetype: Archetype): boolean {
    return archetype.components
      .keys()
      .some((component) => component.isEntity());
  }
  match(archetype: Archetype): IteratorObject<Entity> {
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
> {
  _doubleWildcardBrand: undefined = undefined;

  private backlinks: Map<Archetype, Set<Pair>> = new Map();
  maybeAddBacklink(archetype: Archetype): void {
    const pairComponents = new Set<Pair>(
      archetype.components.keys().filter((component) => component.isPair()),
    );
    if (pairComponents.size > 0) {
      this.backlinks.set(archetype, pairComponents);
    }
  }

  matchingArchetypes(): IteratorObject<[Archetype, Set<Pair>]> {
    return this.backlinks.entries();
  }
  matches(archetype: Archetype): boolean {
    return archetype.components.keys().some((component) => component.isPair());
  }
  match(archetype: Archetype): IteratorObject<Pair> {
    return archetype.components
      .keys()
      .filter((component) => component.isPair()) as IteratorObject<Pair>;
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
> {
  _relationshipWildcardBrand: undefined = undefined;

  readonly relationship: Entity;

  constructor(relationship: Entity) {
    this.relationship = relationship;
  }

  private pairsLookup: Map<Entity, Pair> = new Map();
  hasBacklinks(): boolean {
    return this.pairsLookup.size > 0;
  }
  addPairBacklink(pair: Pair): void {
    this.pairsLookup.set(pair.target, pair);
  }
  lookupTarget(target: Entity): Pair | undefined {
    return this.pairsLookup.get(target);
  }

  private backlinks: Map<Archetype, Set<Pair>> = new Map();
  addBacklink(archetype: Archetype, pair: Pair): void {
    const existing = this.backlinks.get(archetype);
    if (existing) {
      existing.add(pair);
    } else {
      this.backlinks.set(archetype, new Set([pair]));
    }
  }
  matchingArchetypes(): IteratorObject<[Archetype, Set<Pair>]> {
    return this.backlinks.entries();
  }
  matches(archetype: Archetype): boolean {
    return archetype.components
      .keys()
      .filter((component) => component.isPair())
      .some((component) => component.relationship === this.relationship);
  }
  match(archetype: Archetype): IteratorObject<Pair> {
    return archetype.components
      .keys()
      .filter((component) => component.isPair())
      .filter((component) => component.relationship === this.relationship);
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
> {
  _wildcardTargetBrand: undefined = undefined;

  target: Entity;
  constructor(target: Entity) {
    this.target = target;
  }

  private backlinks: Map<Archetype, Set<Pair>> = new Map();
  addBacklink(archetype: Archetype, pair: Pair): void {
    const existing = this.backlinks.get(archetype);
    if (existing) {
      existing.add(pair);
    } else {
      this.backlinks.set(archetype, new Set([pair]));
    }
  }
  matchingArchetypes(): IteratorObject<[Archetype, Set<Pair>]> {
    return this.backlinks.entries();
  }

  matches(archetype: Archetype): boolean {
    return archetype.components
      .keys()
      .filter((component) => component.isPair())
      .some((component) => component.target === this.target);
  }
  match(archetype: Archetype): IteratorObject<Pair> {
    return archetype.components
      .keys()
      .filter((component) => component.isPair())
      .filter(
        (component) => component.target === this.target,
      ) as IteratorObject<Pair>;
  }
}

export function isWildcardTarget<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
>(value: unknown): value is WildcardTarget<Archetype, Entity, Pair> {
  return value instanceof WildcardTarget;
}
