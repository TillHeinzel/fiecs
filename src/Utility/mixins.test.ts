/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { expect, test } from "vitest";

import { MergeCtor, MixinBase } from "./mixins";

test("example from web", () => {
  function GeometryMixin<TBase extends MixinBase>(Base: TBase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Derived = class Geometry extends (Base as any) {
      shape: "rectangle" | "triangle";
      constructor(props: { shape: "rectangle" | "triangle" }) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super(props);
        this.shape = props.shape;
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  }

  // const IGeometry = GeometryMixin(class {});

interface IPhysics<T> {
  mass: number;
  set: Set<T>;
}
    
  const PhysicsMixin =<T>()=>(
    <TBase extends MixinBase>(Base: TBase) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Derived = class Physics extends (Base as any) implements IPhysics<T> {
        mass: number = 0;
        set: Set<T> = new Set();
        constructor(props: { mass?: number }) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          super(props);
          this.mass = props.mass ?? 0;
        }
      };

      return Derived as MergeCtor<typeof Derived, TBase>;
    });

    const physicsPhunction = <T>(p: IPhysics<T>) => { 
        p.mass = 10;
    }

  // Including the base
  class EntityBase {
    name: string;
    constructor(props: { name: string }) {
      this.name = props.name;
    }
  }

  const Entity = PhysicsMixin<Entity2>()(GeometryMixin(EntityBase));
  class Entity2 extends Entity {
    constructor(props: {
      name: string;
      shape: "rectangle" | "triangle";
      mass?: number;
    }) {
      super(props);
    }
  }

const e2 = new Entity2({ name: "e2", shape: "rectangle" });
physicsPhunction(e2);

  const player = new Entity2({ shape: "rectangle", mass: 70, name: "Player" });

  expect(player.mass).toBe(70);
  expect(player.name).toBe("Player");
  expect(player.shape).toBe("rectangle");
});

// test("real test", () => {
//   interface IArchetype<
//     Archetype extends IArchetype<Archetype, Entity, Pair>,
//     Entity extends StorageEntity<Archetype, Entity, Pair>,
//     Pair extends IPair<Archetype, Entity, Pair>,
//   > {
//     readonly components: ReadonlySet<Entity | Pair>;
//     entities: Set<Entity>;

//     detachConnections(): void;
//   }

//   interface IPair<
//     Archetype extends IArchetype<Archetype, Entity, Pair>,
//     Entity extends StorageEntity<Archetype, Entity, Pair>,
//     Pair extends IPair<Archetype, Entity, Pair>,
//   > {
//     relationship: Entity;
//     target: Entity;
//     backLinksComponent: Set<Archetype>;
//   }

//   interface StorageEntity<
//     Archetype extends IArchetype<Archetype, Entity, Pair>,
//     Entity extends StorageEntity<Archetype, Entity, Pair>,
//     Pair extends IPair<Archetype, Entity, Pair>,
//   > {
//     archetype?: Archetype;
//     componentData?: Map<Entity | Pair, unknown>;
//     backLinksComponent?: Set<Archetype>;
//     backLinksRelationship?: Map<Entity, Pair>;
//     backLinksTarget?: Map<Entity, Pair>;
//     target?: undefined;
//   }

//   class Entity implements StorageEntity<Archetype, Entity, Pair> {}

//   // applyMixins(Entity, []);

//   class Pair implements IPair<Archetype, Entity, Pair> {
//     relationship: Entity;
//     target: Entity;
//     backLinksComponent: Set<Archetype> = new Set();

//     constructor(type: Entity, target: Entity) {
//       this.target = target;
//       this.relationship = type;
//     }
//   }

//   class Archetype implements IArchetype<Archetype, Entity, Pair> {
//     readonly components: ReadonlySet<Entity | Pair>;
//     entities = new Set<Entity>();

//     constructor(components: ReadonlySet<Entity | Pair>) {
//       this.components = components;
//     }

//     detachConnections() {
//       for (const component of this.components) {
//         component.backLinksComponent?.delete(this);
//       }
//     }
//   }

//   const e = new Entity();

//   //   expect(e.componentData).toBeInstanceOf(Map);
//   expect(Object.getPrototypeOf(e)).toBe(Entity.prototype);
//   expect(JSON.stringify(Object.getPrototypeOf(Object.getPrototypeOf(e)))).toBe(
//     "{}",
//   );
//   //   expect(Object.getOwnPropertyNames(Object.getPrototypeOf(e))).toEqual([]);
//   expect(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(e))).toEqual(
//     {},
//   );
// });
