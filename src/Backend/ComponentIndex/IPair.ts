import { MixinBase } from "#/Utility/mixins";

import { IArchetype } from "./IArchetype";
import { IEntity } from "./IEntity";

interface IPairIn<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  relationship: Entity;
  target: Entity;

  isPair(): this is Pair;
  isEntity(): this is Entity;
}

export interface IPair<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> extends IPairIn<Archetype, Entity, Pair> {
  removeBacklink(archetype: Archetype): void;
  addBacklink(archetype: Archetype): void;

  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<Pair>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<Pair>]>;
}

export const PairMixin =
  <
    Archetype extends IArchetype<Archetype, Entity, Pair>,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair extends IPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase<IPairIn<Archetype, Entity, Pair>>>(Base: TBase) => {
    const Derived = class StoragePair
      extends Base
      implements IPair<Archetype, Entity, Pair>
    {
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
        this.relationship.getRelationshipWildcard().removeBacklink(archetype);
        this.target.getWildcardTarget().removeBacklink(archetype);
      }
      addBacklink(archetype: Archetype): void {
        if (!this.backLinksComponent) {
          this.backLinksComponent = new Set();
        }
        this.backLinksComponent.add(archetype);
        this.relationship
          .getRelationshipWildcard()
          .addBacklinkIfMatches(archetype);
        this.target.getWildcardTarget().addBacklinkIfMatches(archetype);
      }

      isPair(): this is Pair {
        return true;
      }
      isEntity(): this is Entity {
        return false;
      }
    };

    return Derived;
  };
