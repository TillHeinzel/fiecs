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

  removeBacklink(archetype: Archetype): void;
  getBacklinks(): IteratorObject<Archetype>;
  addBacklink(archetype: Archetype): void;

  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<Pair>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<Pair>]>;

  isPair(): this is Pair;

  isEntity(): this is Entity;
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

      constructor(props: { relationship: Entity; target: Entity }) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super(props);

        this.relationship = props.relationship;
        this.target = props.target;
      }

      backLinksComponent?: Set<Archetype>;
      matches(archetype: Archetype): boolean {
        return this.backLinksComponent?.has(archetype) ?? false;
      }

      match(archetype: Archetype): IteratorObject<Pair> {
        return archetype.components
          .keys()
          .filter((component) => component.isPair())
          .filter((component) => component === (this as unknown as Pair));
      }

      matchingArchetypes(): IteratorObject<[Archetype, Set<Pair>]> {
        if (!this.backLinksComponent) return [][Symbol.iterator]();
        return this.backLinksComponent
          .keys()
          .map((archetype) => [
            archetype,
            new Set<Pair>([this as unknown as Pair]),
          ]);
      }

      removeBacklink(archetype: Archetype): void {
        this.backLinksComponent?.delete(archetype);
      }
      getBacklinks(): IteratorObject<Archetype> {
        return this.backLinksComponent?.values() ?? [][Symbol.iterator]();
      }
      addBacklink(archetype: Archetype): void {
        if (!this.backLinksComponent) {
          this.backLinksComponent = new Set();
        }
        this.backLinksComponent.add(archetype);
        this.relationship
          .getRelationshipWildcard()
          .addBacklink(archetype, this as unknown as Pair);
        this.target
          .getWildcardTarget()
          .addBacklink(archetype, this as unknown as Pair);
      }

      isPair(): this is Pair {
        return true;
      }
      isEntity(): this is Entity {
        return false;
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  };
