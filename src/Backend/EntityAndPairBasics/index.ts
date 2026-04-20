import { MergeCtor, MixinBase } from "#/Utility/mixins";

export interface IEntity<
  Archetype,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  isPair(): this is Pair;
  isEntity(): this is Entity;

  addPairBacklink(pair: Pair): void;
  lookupPairWith(target: Entity): Pair | undefined;
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
      private pairsWhereThisIsRelationship?: Map<Entity, Pair>;

      addPairBacklink(pair: Pair): void {
        if (!this.pairsWhereThisIsRelationship) {
          this.pairsWhereThisIsRelationship = new Map();
        }
        this.pairsWhereThisIsRelationship.set(pair.target, pair);
      }

      lookupPairWith(target: Entity): Pair | undefined {
        return this.pairsWhereThisIsRelationship?.get(target);
      }

      isPair(): this is Pair {
        return false;
      }
      isEntity(): this is Entity {
        return true;
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

  isPair(): this is Pair;
  isEntity(): this is Entity;
}

export const PairMixin =
  <
    Archetype,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair extends IPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class StoragePair
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extends (Base as any)
      implements IPair<Archetype, Entity, Pair>
    {
      relationship: Entity;
      target: Entity;

      constructor(props: { relationship: Entity; target: Entity }) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super(props);

        this.relationship = props.relationship;
        this.target = props.target;

        this.relationship.addPairBacklink(this as unknown as Pair);
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
