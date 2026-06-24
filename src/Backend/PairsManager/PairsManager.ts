import { IEntity, IPair } from "./mixins";

export class PairsManager<
  Archetype,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  constructor(
    Pair: new (props: { relationship: Entity; target: Entity }) => Pair,
  ) {
    this.Pair = Pair;
  }

  private Pair;

  lookupPair(relationship: Entity, target: Entity): Pair | undefined {
    return relationship._lookupPairWithTarget(target);
  }

  ensurePair(relationship: Entity, target: Entity): Pair {
    const existingPair = this.lookupPair(relationship, target);
    if (existingPair) {
      return existingPair;
    }
    const newPair = new this.Pair({ relationship, target });
    relationship._addrelationshipPairBacklink(newPair);
    target._addTargetPairBacklink(newPair);
    return newPair;
  }

  getAllRelationshipsForTarget(target: Entity): IteratorObject<[Entity, Pair]> {
    return target._getAllRelationshipsWithThisAsTarget();
  }

  getAllTargetsForRelationship(
    relationship: Entity,
  ): IteratorObject<[Entity, Pair]> {
    return relationship._getAllTargetsWithThisAsRelationship();
  }
}
