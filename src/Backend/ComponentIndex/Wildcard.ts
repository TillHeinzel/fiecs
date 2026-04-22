import { ArchetypeMatcher } from "./ComponentIndex";
import { IArchetype } from "./IArchetype";
import { IEntity } from "./IEntity";
import { IPair } from "./IPair";

abstract class BacklinkQueryable<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
  T extends Entity | Pair,
> implements ArchetypeMatcher<Archetype, Entity, Pair, T> {
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

  matchingArchetypes(): IteratorObject<Archetype> {
    return this.backlinks.keys();
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
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> extends BacklinkQueryable<Archetype, Entity, Pair, Entity> {
  _wildcardBrand: undefined = undefined;

  protected checkMatch(
    archetype: Archetype,
  ): IteratorObject<Entity, unknown, unknown> {
    return archetype.components
      .keys()
      .filter((component) => component.isEntity());
  }
}

export function isWildcard<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(value: unknown): value is Wildcard<Archetype, Entity, Pair> {
  return value instanceof Wildcard;
}

// [*,*]
export class DoubleWildcard<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
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

export function isDoubleWildcard<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(value: unknown): value is DoubleWildcard<Archetype, Entity, Pair> {
  return value instanceof DoubleWildcard;
}

// [relationship, *]
export class RelationshipWildcard<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> extends BacklinkQueryable<Archetype, Entity, Pair, Pair> {
  _relationshipWildcardBrand: undefined = undefined;

  readonly relationship: Entity;

  constructor(relationship: Entity) {
    super();
    this.relationship = relationship;
  }

  protected checkMatch(archetype: Archetype): IteratorObject<Pair> {
    return archetype.components
      .keys()
      .filter((component) => component.isPair())
      .filter((pair) => pair.relationship === this.relationship);
  }
}

export function isRelationshipWildcard<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(value: unknown): value is RelationshipWildcard<Archetype, Entity, Pair> {
  return value instanceof RelationshipWildcard;
}

// [*, target]
export class WildcardTarget<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
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
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(value: unknown): value is WildcardTarget<Archetype, Entity, Pair> {
  return value instanceof WildcardTarget;
}
