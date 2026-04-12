import { Archetype } from "./Archetype";
import { Hooks } from "./Hooks";
import { IEntity, IPair } from "./Storage";

export type Id = Entity | Pair;

export class Entity implements IEntity<Archetype, Entity, Pair> {
  archetype: Archetype;
  componentData: Map<Id, unknown> = new Map();
  // archetypes that have this entity as a component
  backLinksComponent?: Set<Archetype> = new Set();
  // relationships where this entity is the type
  backLinksRelationship?: Map<Entity, Pair>;
  // relationships where this entity is the target
  backLinksTarget?: Map<Entity, Pair>;

  target: undefined = undefined;

  name?: string;
  printName(): string | undefined {
    return this.name;
  }
  hooks: Hooks = new Hooks();

  initializer?: Initializer;
  relationshipHasNoData?: boolean;

  constructor(archetype: Archetype) {
    this.archetype = archetype;
  }
}

export type Initializer = {
  canDefaultInitialize: boolean;
  tryInitialize: (val?: { data: unknown }) => unknown;
};

export class Pair implements IPair<Entity, Archetype> {
  relationship: Entity;
  target: Entity;
  backLinksComponent: Set<Archetype> = new Set();

  initializer?: Initializer;

  printName(): string | undefined {
    return `(${this.relationship.name}, ${this.target.name})`;
  }

  constructor(type: Entity, target: Entity) {
    this.target = target;
    this.relationship = type;

    this.initializer = (() => {
      if (type.initializer !== undefined && target.initializer === undefined) {
        return type.initializer;
      }
      if (
        type.initializer === undefined &&
        target.initializer !== undefined &&
        !type.relationshipHasNoData
      ) {
        return target.initializer;
      }
      if (
        type.initializer !== undefined &&
        target.initializer !== undefined &&
        !type.relationshipHasNoData
      ) {
        return type.initializer;
      }
      // type.initializer === undefined && target.initializer === undefined
      return undefined;
    })();
  }
}

export enum IdType {
  Tag,
  Component,
  RelationshipTag,
  RelationshipComponent,
}

export function isPair(id: Id): id is Pair {
  return id.target !== undefined;
}

type IdWithData = Id & { initializer: Initializer };

export function hasData(id: Id): id is IdWithData {
  return id.initializer !== undefined;
}

type IdWithDefaultInitialize = IdWithData & {
  initializer: Initializer & { defaultInitialize: () => unknown };
};

export function canDefaultInitialize(id: Id): id is IdWithDefaultInitialize {
  return !hasData(id) || id.initializer.canDefaultInitialize;
}

export function idType(id: Id): IdType {
  if (!hasData(id) && !isPair(id)) {
    return IdType.Tag;
  }
  if (hasData(id) && !isPair(id)) {
    return IdType.Component;
  }
  if (!hasData(id) && isPair(id)) {
    return IdType.RelationshipTag;
  }
  // (hasData(id) && isPair(id))
  return IdType.RelationshipComponent;
}

export function getRelationshipPairs(
  entity: Entity,
  relationship: Entity,
): Set<Pair> {
  return new Set(
    entity.archetype.components
      .keys()
      .filter((component) => isPair(component))
      .filter((pair) => pair.relationship === relationship),
  );
}

export function getRelationshipTargets(
  entity: Entity,
  relationship: Entity,
): Set<Entity> {
  return new Set(
    entity.archetype.components
      .keys()
      .filter((component) => isPair(component))
      .filter((pair) => pair.relationship === relationship)
      .map((pair) => pair.target),
  );
}

export function getARelationshipPair(
  entity: Entity,
  relationship: Entity,
): Pair | undefined {
  return entity.archetype.components
    .keys()
    .filter((component) => isPair(component))
    .find((pair) => pair.relationship === relationship);
}

export function getARelationshipTarget(
  entity: Entity,
  relationship: Entity,
): Entity | undefined {
  return entity.archetype.components
    .keys()
    .filter((component) => isPair(component))
    .find((pair) => pair.relationship === relationship)?.target;
}

export function isInUseAsComponent(entity: Entity): boolean {
  return (
    (entity.backLinksComponent !== undefined &&
      entity.backLinksComponent.size > 0) ||
    (entity.backLinksRelationship !== undefined &&
      entity.backLinksRelationship.size > 0)
  );
}

export function hasAnyRelationship(
  entity: Entity,
  relationship: Entity,
): boolean {
  for (const component of entity.archetype.components) {
    if (
      component.target !== undefined &&
      component.relationship === relationship
    ) {
      return true;
    }
  }
  return false;
}
