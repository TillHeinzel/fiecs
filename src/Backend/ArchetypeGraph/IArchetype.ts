import { MixinBase } from "#/Utility/mixins";

import { Links } from "./Links";

interface IArchetypeIn<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair,
> {
  readonly components: ReadonlySet<Entity | Pair>;
}

export interface IArchetype<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair,
> extends IArchetypeIn<Archetype, Entity, Pair> {
  entities: Set<Entity>;

  readonly links: Links<Archetype, Entity | Pair>;
}

export const ArchetypeMixin =
  <
    Archetype extends IArchetype<Archetype, Entity, Pair>,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair,
  >() =>
  <TBase extends MixinBase<IArchetypeIn<Archetype, Entity, Pair>>>(
    Base: TBase,
  ) => {
    const Derived = class
      extends Base
      implements IArchetype<Archetype, Entity, Pair>
    {
      entities = new Set<Entity>();

      readonly links: Links<Archetype, Entity | Pair> = new Links<
        Archetype,
        Entity | Pair
      >(this as unknown as Archetype);
    };

    return Derived;
  };

export interface IEntity<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair,
> {
  readonly archetype?: Archetype;

  destruct(): void;

  get(id: Entity | Pair): unknown;
  set(id: Entity | Pair, value: unknown): void;

  moveToArchetype(
    newArchetype: Archetype,
    removedComponents: ReadonlySet<Entity | Pair>,
  ): void;

  isAlive(): this is Entity & {
    archetype: Archetype;
  };
}

export const EntityMixin =
  <
    Archetype extends IArchetype<Archetype, Entity, Pair>,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class
      extends Base
      implements IEntity<Archetype, Entity, Pair>
    {
      archetype?: Archetype;
      componentData: Map<Entity | Pair, unknown> = new Map();

      moveToArchetype(
        newArchetype: Archetype,
        removedComponents: ReadonlySet<Entity | Pair> = new Set(),
      ) {
        this.archetype?.entities.delete(this as unknown as Entity);
        newArchetype.entities.add(this as unknown as Entity);
        this.archetype = newArchetype;
        removedComponents.forEach((component) =>
          this.componentData.delete(component),
        );
      }

      destruct(): void {
        this.archetype?.entities.delete(this as unknown as Entity);
        this.archetype = undefined;
        this.componentData.clear();
      }

      get(id: Entity | Pair): unknown {
        return this.componentData.get(id);
      }
      set(id: Entity | Pair, value: unknown): void {
        this.componentData.set(id, value);
      }

      isAlive(): this is Entity & {
        archetype: Archetype;
      } {
        return this.archetype !== undefined;
      }
    };

    return Derived;
  };
