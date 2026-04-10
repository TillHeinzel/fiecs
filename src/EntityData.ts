import { Archetype } from "./Archetype";
import { Hooks } from "./Hooks";

export type Id = Entity | Pair;

export class Entity {
  name?: string;
  _isAlive: boolean;

  archetype: Archetype;
  componentData: Map<Id, unknown>;

  type: Entity = this;
  target: undefined = undefined;

  // archetypes that have this entity as a component
  backLinksComponent?: Set<Archetype> = new Set();
  // relationships where this entity is the type
  backLinksType?: Map<Entity, Pair>;
  // relationships where this entity is the target
  backLinksTarget?: Map<Entity, Pair>;

  initializer?: Initializer;
  relationshipHasNoData?: boolean;

  hooks?: Hooks;

  constructor(archetype: Archetype) {
    this._isAlive = true;
    this.componentData = new Map();
    this.archetype = archetype;
  }
}

export function getName(id: Id): string | undefined {
  if (isPair(id)) {
    return `(${id.type.name}, ${id.target.name})`;
  }
  return id.name;
}

export function has(e: Entity, component: Id) {
  return e.archetype.components.has(component);
}

export type Initializer = {
  initialize: (val: unknown) => unknown;
  defaultInitialize?: () => unknown;
};

export class Pair {
  type: Entity;
  target: Entity;
  backLinksComponent: Set<Archetype> = new Set();

  initializer?: Initializer;

  constructor(type: Entity, target: Entity) {
    this.target = target;
    this.type = type;

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
  return !hasData(id) || id.initializer?.defaultInitialize !== undefined;
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
      .filter((pair) => pair.type === relationship),
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
      .filter((pair) => pair.type === relationship)
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
    .find((pair) => pair.type === relationship);
}

export function getARelationshipTarget(
  entity: Entity,
  relationship: Entity,
): Entity | undefined {
  return entity.archetype.components
    .keys()
    .filter((component) => isPair(component))
    .find((pair) => pair.type === relationship)?.target;
}

export function isInUseAsComponent(entity: Entity): boolean {
  return (
    (entity.backLinksComponent !== undefined &&
      entity.backLinksComponent.size > 0) ||
    (entity.backLinksType !== undefined && entity.backLinksType.size > 0)
  );
}
