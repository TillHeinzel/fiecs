import { MixinBase } from "#/Utility/mixins";

export interface IEntity<
  Archetype,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  _addPairBacklink(pair: Pair): void;
  _lookupPairWith(target: Entity): Pair | undefined;
}

export const EntityMixin =
  <
    Archetype,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair extends IPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class
      extends Base
      implements IEntity<Archetype, Entity, Pair>
    {
      pairsWhereThisIsRelationship?: Map<Entity, Pair>;

      _addPairBacklink(pair: Pair): void {
        if (!this.pairsWhereThisIsRelationship) {
          this.pairsWhereThisIsRelationship = new Map();
        }
        this.pairsWhereThisIsRelationship.set(pair.target, pair);
      }

      _lookupPairWith(target: Entity): Pair | undefined {
        return this.pairsWhereThisIsRelationship?.get(target);
      }
    };

    return Derived;
  };

export interface IPair<
  Archetype,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  relationship: Entity;
  target: Entity;
}
