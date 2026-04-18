import { MergeCtor, MixinBase } from "#/Utility/mixins";

import { IStorageEntity } from "./IEntity";
import { ILogger } from "./ILogger";
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

  detachConnections(logger: ILogger): void;
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

      detachConnections(logger: ILogger) {
        this.links.detachLinks(logger);
        // @ts-expect-error //GC
        this.links = null as unknown as Links<Archetype, Entity | Pair>;
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  };
