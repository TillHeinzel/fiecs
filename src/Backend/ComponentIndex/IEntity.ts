import { MixinBase } from "#/Utility/mixins";

import { IArchetype } from "./IArchetype";
import { IPair } from "./IPair";
import { RelationshipWildcard, WildcardTarget } from "./Wildcard";

interface IEntityIn<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  isPair(): this is Pair;
  isEntity(): this is Entity;

  lookupPairWith(target: Entity): Pair | undefined;
}

export interface IEntity<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> extends IEntityIn<Archetype, Entity, Pair> {
  removeBacklink(archetype: Archetype): void;
  addBacklink(archetype: Archetype): void;

  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<Entity>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<Entity>]>;

  getRelationshipWildcard(): RelationshipWildcard<Archetype, Entity, Pair>;
  getWildcardTarget(): WildcardTarget<Archetype, Entity, Pair>;
}

export const EntityMixin =
  <
    Archetype extends IArchetype<Archetype, Entity, Pair>,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair extends IPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase<IEntityIn<Archetype, Entity, Pair>>>(
    Base: TBase,
  ) => {
    const Derived = class StorageEntity
      extends Base
      implements IEntity<Archetype, Entity, Pair>
    {
      backLinksComponent?: Set<Archetype> | undefined;

      relationshipWildcard?: RelationshipWildcard<Archetype, Entity, Pair>;
      wildcardTarget?: WildcardTarget<Archetype, Entity, Pair>;

      matches(archetype: Archetype): boolean {
        return this.backLinksComponent?.has(archetype) ?? false;
      }

      match(archetype: Archetype): IteratorObject<Entity> {
        return archetype.components
          .keys()
          .filter((component) => component.isEntity())
          .filter((component) => component === (this as unknown as Entity));
      }

      matchingArchetypes(): IteratorObject<[Archetype, Set<Entity>]> {
        if (!this.backLinksComponent) return [][Symbol.iterator]();
        return this.backLinksComponent
          .keys()
          .map((archetype) => [
            archetype,
            new Set<Entity>([this as unknown as Entity]),
          ]);
      }

      removeBacklink(archetype: Archetype): void {
        this.backLinksComponent?.delete(archetype);
      }
      addBacklink(archetype: Archetype): void {
        if (!this.backLinksComponent) {
          this.backLinksComponent = new Set();
        }
        this.backLinksComponent.add(archetype);
      }

      getRelationshipWildcard(): RelationshipWildcard<Archetype, Entity, Pair> {
        if (!this.relationshipWildcard) {
          this.relationshipWildcard = new RelationshipWildcard(
            this as unknown as Entity,
          );
        }
        return this.relationshipWildcard;
      }
      getWildcardTarget(): WildcardTarget<Archetype, Entity, Pair> {
        if (!this.wildcardTarget) {
          this.wildcardTarget = new WildcardTarget(this as unknown as Entity);
        }
        return this.wildcardTarget;
      }
    };

    return Derived;
  };
