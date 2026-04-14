import { MergeCtor, MixinBase } from "#/mixins/mixins";

import { IStorageEntity } from "./IEntity";
import { IStoragePair } from "./IPair";
import { Links } from "./Links";

export interface IStorageArchetype<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  readonly components: ReadonlySet<Entity | Pair>;
  entities: Set<Entity>;

  readonly links: Links<Archetype, Entity | Pair>;

  detachConnections(): void;
}

export const StorageArchetypeMixin =
  <
    Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
    Entity extends IStorageEntity<Archetype, Entity, Pair>,
    Pair extends IStoragePair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class
      extends // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Base as any)
      implements IStorageArchetype<Archetype, Entity, Pair>
    {
      readonly components: ReadonlySet<Entity | Pair>;
      entities = new Set<Entity>();

      readonly links: Links<Archetype, Entity | Pair> = new Links<
        Archetype,
        Entity | Pair
      >(this as unknown as Archetype);

      constructor(props: { components: ReadonlySet<Entity | Pair> }) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super(props);
        this.components = props.components;
      }

      detachConnections() {
        for (const component of this.components) {
          component.backLinksComponent?.delete(this as unknown as Archetype);
        }

        this.links.detachLinks();
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  };
