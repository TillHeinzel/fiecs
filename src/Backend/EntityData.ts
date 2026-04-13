import { Archetype } from "./Archetype";
import { Hooks } from "./Hooks";
import { IEntity, IPair } from "./Storage/IEntity";

export type Id = Entity | Pair;

export class Entity implements IEntity<Archetype, Entity, Pair> {
  archetype?: Archetype;
  componentData: Map<Id, unknown> = new Map();
  // archetypes that have this entity as a component
  backLinksComponent?: Set<Archetype> = new Set();
  // relationships where this entity is the type
  backLinksRelationship?: Map<Entity, Pair>;
  // relationships where this entity is the target
  backLinksTarget?: Map<Entity, Pair>;

  target: undefined = undefined;

  name?: string;

  hooks: Hooks = new Hooks();

  initializer?: Initializer;
  relationshipHasNoData?: boolean;
}

export type Initializer = {
  canDefaultInitialize: boolean;
  tryInitialize: (val?: { data: unknown }) => unknown;
};

export class Pair implements IPair<Archetype, Entity, Pair> {
  relationship: Entity;
  target: Entity;
  backLinksComponent: Set<Archetype> = new Set();

  initializer?: Initializer;

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
