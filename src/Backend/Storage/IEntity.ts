import { MergeCtor, MixinBase } from "#/mixins/mixins";

import { IStorageArchetype } from "./IArchetype";
import { IStoragePair } from "./IPair";

export interface IStorageEntity<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  archetype?: Archetype;
  componentData: Map<Entity | Pair, unknown>;
  // archetypes that have this entity as a component
  backLinksComponent?: Set<Archetype>;
  // relationships where this entity is the type
  backLinksRelationship?: Map<Entity, Pair>;
  // relationships where this entity is the target
  backLinksTarget?: Map<Entity, Pair>;
  target?: undefined; // to distinguish from Pair

  isPair(): this is Pair;
  isAlive(): this is IStorageEntity<Archetype, Entity, Pair> & {
    archetype: Archetype;
  };

  getARelationshipPair(relationship: Entity): Pair | undefined;
  getRelationshipPairs(relationship: Entity): Set<Pair>;
  hasAnyRelationship(relationship: Entity): boolean;

  isInUseAsComponent(): boolean;
}

export const StorageEntityMixin =
  <
    Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
    Entity extends IStorageEntity<Archetype, Entity, Pair>,
    Pair extends IStoragePair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class StorageEntity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extends (Base as any)
      implements IStorageEntity<Archetype, Entity, Pair>
    {
      archetype?: Archetype;
      componentData: Map<Entity | Pair, unknown> = new Map();
      // archetypes that have this entity as a component
      backLinksComponent?: Set<Archetype> = new Set();
      // relationships where this entity is the type
      backLinksRelationship?: Map<Entity, Pair>;
      // relationships where this entity is the target
      backLinksTarget?: Map<Entity, Pair>;

      constructor(props: object) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super(props);
      }

      isPair(): this is Pair {
        return false;
      }

      isAlive(): this is IStorageEntity<Archetype, Entity, Pair> & {
        archetype: Archetype;
      } {
        return this.archetype !== undefined;
      }

      getARelationshipPair(relationship: Entity): Pair | undefined {
        if (!this.isAlive()) return undefined;
        return this.archetype.components
          .keys()
          .filter((component) => component.isPair())
          .find((pair) => pair.relationship === relationship);
      }
      getRelationshipPairs(relationship: Entity): Set<Pair> {
        if (!this.isAlive()) return new Set();
        return new Set(
          this.archetype.components
            .keys()
            .filter((component) => component.isPair())
            .filter((pair) => pair.relationship === relationship),
        );
      }
      hasAnyRelationship(relationship: Entity): boolean {
        if (!this.isAlive()) return false;
        return this.archetype.components
          .keys()
          .filter((component) => component.isPair())
          .some((pair) => pair.relationship === relationship);
      }

      isInUseAsComponent(): boolean {
        return (
          (this.backLinksComponent !== undefined &&
            this.backLinksComponent.size > 0) ||
          (this.backLinksRelationship !== undefined &&
            this.backLinksRelationship.size > 0)
        );
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  };
