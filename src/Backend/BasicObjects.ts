import * as ArchetypeGraph from "./ArchetypeGraph";
import * as ComponentIndex from "./ComponentIndex";
import * as DataInitializer from "./DataInitializer";
import * as Hooks from "./Hooks";
import * as PairsManager from "./PairsManager";

const EntitySuper: new (
  o: object,
) => PairsManager.IEntity<Archetype, Entity, Pair> &
  ComponentIndex.IEntity<Archetype, Entity, Pair> &
  Hooks.IEntity<Archetype, Entity, Pair> &
  DataInitializer.IEntity<Archetype, Entity, Pair> &
  ArchetypeGraph.IEntity<Archetype, Entity, Pair> = //
  DataInitializer.EntityMixin<Archetype, Entity, Pair>()(
    Hooks.EntityMixin<Archetype, Entity, Pair>()(
      ComponentIndex.EntityMixin<Archetype, Entity, Pair>()(
        ArchetypeGraph.EntityMixin<Archetype, Entity, Pair>()(
          PairsManager.EntityMixin<Archetype, Entity, Pair>()(
            //
            class {
              isPair(): this is Pair {
                return false;
              }
              isEntity(): this is Entity {
                return true;
              }
            },
          ),
        ),
      ),
    ),
  );

const ArchetypeSuper: new (o: {
  components: ReadonlySet<Entity | Pair>;
}) => Hooks.IArchetype<Archetype, Entity, Pair> &
  ArchetypeGraph.IArchetype<Archetype, Entity, Pair> = //
  Hooks.ArchetypeMixin<Archetype, Entity, Pair>()(
    ArchetypeGraph.ArchetypeMixin<Archetype, Entity, Pair>()(
      //
      class {
        readonly components: ReadonlySet<Entity | Pair>;

        constructor(props: { components: ReadonlySet<Entity | Pair> }) {
          this.components = props.components;
        }
      },
    ),
  );

const PairSuper: new (o: {
  relationship: Entity;
  target: Entity;
}) => PairsManager.IPair<Archetype, Entity, Pair> &
  Hooks.IPair<Archetype, Entity, Pair> &
  ComponentIndex.IPair<Archetype, Entity, Pair> &
  DataInitializer.IPair<Archetype, Entity, Pair> = //
  DataInitializer.PairMixin<Archetype, Entity, Pair>()(
    Hooks.PairMixin<Archetype, Entity, Pair>()(
      ComponentIndex.PairMixin<Archetype, Entity, Pair>()(
        //
        class {
          relationship: Entity;
          target: Entity;

          constructor(props: { relationship: Entity; target: Entity }) {
            this.relationship = props.relationship;
            this.target = props.target;
          }

          isPair(): this is Pair {
            return true;
          }
          isEntity(): this is Entity {
            return false;
          }
        },
      ),
    ),
  );

export class Archetype extends ArchetypeSuper {}
export class Entity extends EntitySuper {
  name?: string;
}
export class Pair extends PairSuper {}
