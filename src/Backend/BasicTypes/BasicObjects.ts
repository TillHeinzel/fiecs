import * as ArchetypeGraph from "../ArchetypeGraph";
import * as ComponentIndex from "../ComponentIndex";
import * as DataInitializer from "../DataInitializer";
import * as Hooks from "../Hooks";
import * as PairsManager from "../PairsManager";

class BasicEntity {
  name?: string;

  getName() {
    return this.name ?? "-unnamed-";
  }

  isPair(): this is Pair {
    return false;
  }
  isEntity(): this is Entity {
    return true;
  }
}

const EntitySuper: new (
  o: object,
) => BasicEntity &
  PairsManager.IEntity<Archetype, Entity, Pair> &
  ComponentIndex.IEntity<Archetype, Entity, Pair> &
  Hooks.IEntity<Archetype, Entity, Pair> &
  DataInitializer.IEntity<Archetype, Entity, Pair> &
  ArchetypeGraph.IEntity<Archetype, Entity, Pair> = //
  DataInitializer.EntityMixin<Archetype, Entity, Pair>()(
    Hooks.EntityMixin<Archetype, Entity, Pair>()(
      ComponentIndex.EntityMixin<Archetype, Entity, Pair>()(
        ArchetypeGraph.EntityMixin<Archetype, Entity, Pair>()(
          PairsManager.EntityMixin<Archetype, Entity, Pair>()(BasicEntity),
        ),
      ),
    ),
  );

const ArchetypeSuper: new (o: {
  components: ReadonlySet<Entity | Pair>;
  index: number;
}) => Hooks.IArchetype<Archetype, Entity, Pair> &
  ArchetypeGraph.IArchetype<Archetype, Entity, Pair> = //
  Hooks.ArchetypeMixin<Archetype, Entity, Pair>()(
    ArchetypeGraph.ArchetypeMixin<Archetype, Entity, Pair>()(
      //
      class {
        readonly components: ReadonlySet<Entity | Pair>;
        readonly index: number;

        constructor(props: {
          components: ReadonlySet<Entity | Pair>;
          index: number;
        }) {
          this.components = props.components;
          this.index = props.index;
        }
      },
    ),
  );

export class BasicPair {
  relationship: Entity;
  target: Entity;

  constructor(props: { relationship: Entity; target: Entity }) {
    this.relationship = props.relationship;
    this.target = props.target;
  }

  isPair(): this is BasicPair {
    return true;
  }
  isEntity(): this is Entity {
    return false;
  }

  getName() {
    return `(${this.relationship.getName()}, ${this.target.getName()})`;
  }
}

const PairSuper: new (o: {
  relationship: Entity;
  target: Entity;
}) => PairsManager.IPair<Archetype, Entity, Pair> &
  Hooks.IPair<Archetype, Entity, Pair> &
  ComponentIndex.IPair<Archetype, Entity, Pair> &
  DataInitializer.IPair<Archetype, Entity, Pair> &
  BasicPair = //
  DataInitializer.PairMixin<Archetype, Entity, Pair>()(
    Hooks.PairMixin<Archetype, Entity, Pair>()(
      ComponentIndex.PairMixin<Archetype, Entity, Pair>()(BasicPair),
    ),
  );

export class Archetype extends ArchetypeSuper {}
export class Entity extends EntitySuper {}
export class Pair extends PairSuper {}

export type IndexedTerm =
  | Wildcard
  | Entity
  | Pair
  | DoubleWildcard
  | RelationshipWildcard
  | WildcardTarget;

export type RelationshipWildcard = ComponentIndex.RelationshipWildcard<
  Archetype,
  Entity,
  Pair
>;
export type WildcardTarget = ComponentIndex.WildcardTarget<
  Archetype,
  Entity,
  Pair
>;
export type DoubleWildcard = ComponentIndex.DoubleWildcard<
  Archetype,
  Entity,
  Pair
>;
export type Wildcard = ComponentIndex.Wildcard<Archetype, Entity, Pair>;

export function isEntity(x: unknown): x is Entity {
  return x instanceof Entity;
}
export function isPair(x: unknown): x is Pair {
  return x instanceof Pair;
}

export function isArchetype(x: unknown): x is Archetype {
  return x instanceof Archetype;
}

export function isWildcard(x: unknown): x is Wildcard {
  return x instanceof ComponentIndex.Wildcard;
}

export function isWildcardTarget(x: unknown): x is WildcardTarget {
  return x instanceof ComponentIndex.WildcardTarget;
}

export function isRelationshipWildcard(x: unknown): x is RelationshipWildcard {
  return x instanceof ComponentIndex.RelationshipWildcard;
}

export function isDoubleWildcard(x: unknown): x is DoubleWildcard {
  return x instanceof ComponentIndex.DoubleWildcard;
}

export function isIndexedTerm(x: unknown): x is IndexedTerm {
  return (
    isEntity(x) ||
    isPair(x) ||
    isWildcard(x) ||
    isWildcardTarget(x) ||
    isRelationshipWildcard(x) ||
    isDoubleWildcard(x)
  );
}
