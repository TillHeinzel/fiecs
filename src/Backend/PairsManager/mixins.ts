import { MixinBase } from "#/Utility/mixins";

export interface IEntity<
  Archetype,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  _addrelationshipPairBacklink(pair: Pair): void;
  _addTargetPairBacklink(pair: Pair): void;
  _lookupPairWithTarget(target: Entity): Pair | undefined;
  _getAllRelationshipsWithThisAsTarget(): IteratorObject<[Entity, Pair]>;
  _getAllTargetsWithThisAsRelationship(): IteratorObject<[Entity, Pair]>;
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
      pairsWhereThisIsTarget?: Map<Entity, Pair>;

      _addrelationshipPairBacklink(pair: Pair): void {
        if (!this.pairsWhereThisIsRelationship) {
          this.pairsWhereThisIsRelationship = new Map();
        }
        this.pairsWhereThisIsRelationship.set(pair.target, pair);
      }

      _addTargetPairBacklink(pair: Pair): void {
        if (!this.pairsWhereThisIsTarget) {
          this.pairsWhereThisIsTarget = new Map();
        }
        this.pairsWhereThisIsTarget.set(pair.relationship, pair);
      }

      _lookupPairWithTarget(target: Entity): Pair | undefined {
        return this.pairsWhereThisIsRelationship?.get(target);
      }

      _getAllRelationshipsWithThisAsTarget(): IteratorObject<
        [Entity, Pair],
        unknown,
        unknown
      > {
        return this.pairsWhereThisIsTarget?.entries() ?? [].values();
      }
      _getAllTargetsWithThisAsRelationship(): IteratorObject<
        [Entity, Pair],
        unknown,
        unknown
      > {
        return this.pairsWhereThisIsRelationship?.entries() ?? [].values();
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
