import { MixinBase } from "#/Utility/mixins";

import { ArchetypeMatcher } from "./ComponentIndex";
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
}

export interface IEntity<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>
  extends
    IEntityIn<Archetype, Entity, Pair>,
    ArchetypeMatcher<Archetype, Entity, Pair, Entity> {
  removeBacklink(archetype: Archetype): void;
  addBacklink(archetype: Archetype): void;

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
      relationshipWildcard?: RelationshipWildcard<Archetype, Entity, Pair>;
      wildcardTarget?: WildcardTarget<Archetype, Entity, Pair>;

      backlinksMap?: Map<Archetype, Set<Entity | Pair>>;
      matches(archetype: Archetype): boolean {
        return this.backlinksMap?.has(archetype) ?? false;
      }

      match(archetype: Archetype): IteratorObject<Entity> {
        return archetype.components
          .keys()
          .filter((component) => component.isEntity())
          .filter((component) => component === (this as unknown as Entity));
      }

      matchingArchetypes(): IteratorObject<Archetype> {
        if (!this.backlinksMap) return [][Symbol.iterator]();
        return this.backlinksMap.keys();
      }

      archetypesWithMatches(): Map<Archetype, Set<Entity | Pair>> {
        return this.backlinksMap
          ? this.backlinksMap
          : new Map<Archetype, Set<Entity | Pair>>();
      }

      removeBacklink(archetype: Archetype): void {
        this.backlinksMap?.delete(archetype);
      }
      addBacklink(archetype: Archetype): void {
        if (!this.backlinksMap) {
          this.backlinksMap = new Map();
        }
        this.backlinksMap.set(
          archetype,
          new Set<Entity>([this as unknown as Entity]),
        );
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
