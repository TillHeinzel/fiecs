import { MergeCtor, MixinBase } from "#/mixins/mixins";

import { IStorageArchetype } from "./IArchetype";
import { IStorageEntity } from "./IEntity";

export interface IStoragePair<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  relationship: Entity;
  target: Entity;
  backLinksComponent: Set<Archetype>;
  isPair(): this is Pair;
}

export const StoragePairMixin =
  <
    Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
    Entity extends IStorageEntity<Archetype, Entity, Pair>,
    Pair extends IStoragePair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class StoragePair
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extends (Base as any)
      implements IStoragePair<Archetype, Entity, Pair>
    {
      relationship: Entity;
      target: Entity;
      backLinksComponent: Set<Archetype> = new Set();

      constructor(props: { relationship: Entity; target: Entity }) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super(props);

        this.relationship = props.relationship;
        this.target = props.target;
      }

      isPair(): this is Pair {
        return true;
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  };
