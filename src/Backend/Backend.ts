import { AtomicOperationManager } from "./AtomicOperationManager";
import { Archetype, Entity, Id, Pair } from "./BasicObjects";
import { HookCallback as HookCallbackGeneric, Operation, Phase } from "./Hooks";
import { NameMap } from "./NameMap";
import * as Storage from "./Storage";
import { QueryBuilder } from "./Storage/Query";

export class Backend {
  storage = new Storage.ECSStorage<Archetype, Entity, Pair>(Archetype, Entity);
  nameMap = new NameMap();
  entities: Set<Entity> = new Set();
  components: Map<unknown, Entity> = new Map();

  wildcard = new Storage.Wildcard<Archetype, Entity, Pair>();

  private operation = new AtomicOperationManager(this.storage);

  queryBuilder = new QueryBuilder<Archetype, Entity, Pair>();

  constructor() {
    this.storage.addNewArchetypeCallbacks.add((newArchetype) => {
      const components = newArchetype.components;
      this.wildcard.addBacklinkIfMatches(newArchetype);
      this.wildcard.doubleWildcard.addBacklinkIfMatches(newArchetype);
      for (const id of components) {
        id.addBacklink(newArchetype);
      }
    });

    this.storage.deleteArchetypeCallbacks.add((archetype) => {
      this.wildcard.removeBacklink(archetype);
      this.wildcard.doubleWildcard.removeBacklink(archetype);
      for (const id of archetype.components) {
        id.removeBacklink(archetype);
      }
    });
  }

  private createEntity() {
    const newEntity = this.storage.createEntity();
    this.entities.add(newEntity);

    return newEntity;
  }

  entity(name?: string) {
    if (name !== undefined) {
      const existingEntity = this.nameMap.lookup(name);
      if (existingEntity) {
        return existingEntity;
      }
    }

    const newEntity = this.createEntity();
    if (name !== undefined) this.setName(newEntity, name);
    return newEntity;
  }

  tag(name?: string) {
    return this.entity(name);
  }

  component(parse: { parse: (val: unknown) => unknown }) {
    const existingComponent = this.components.get(parse);
    if (existingComponent) {
      return existingComponent;
    }

    const newComponent = this.createEntity();

    newComponent.addDataInitializer(parse);
    this.components.set(parse, newComponent);

    return newComponent;
  }

  pair(relationship: Entity, target: Entity) {
    const lookupExistingPair = () => {
      return relationship.lookupPairWith(target);
    };

    const createNewPair = () => {
      const newPair = new Pair({ relationship, target });

      relationship.getRelationshipWildcard().addPairBacklink(newPair);

      return newPair;
    };
    return lookupExistingPair() ?? createNewPair();
  }

  initializer(component: Entity) {
    return this.components
      .entries()
      .find(([, comp]) => comp === component)?.[0];
  }

  getName(entity: Entity) {
    return entity.name;
  }

  setName(entity: Entity, name: string) {
    if (this.nameMap.hasLookupName(name)) {
      throw new Error(`Entity with name ${name} already exists`);
    }

    this.nameMap.setLookupName(entity, name);
    entity.name = name;
  }

  getDisplayName(id: Id): string {
    if (id.isPair()) {
      return `(${this.getDisplayName(id.relationship)}, ${this.getDisplayName(id.target)})`;
    } else {
      return id.name ?? "-unnamed-";
    }
  }

  lookupEntity(name: string) {
    return this.nameMap.lookup(name);
  }

  isAlive(entity: Entity) {
    return entity.isAlive();
  }

  destruct(entity: Entity) {
    if (entity.hasData()) {
      throw new Error("Components cannot be destructed (by default)");
    }

    if (entity.name) {
      this.nameMap.deleteName(entity.name);
    }
    entity.name = undefined;
    this.entities.delete(entity);

    Storage.mergeResults<Archetype, Entity, Pair>([
      this.makeQuery(entity).matchingArchetypes(),
      this.makeQuery([entity, this.wildcard]).matchingArchetypes(),
      this.makeQuery([this.wildcard, entity]).matchingArchetypes(),
    ])
      .entries()
      .forEach(([archetype, components]) => {
        this.storage.moveAllEntities(archetype, components);
        this.storage.cleanup(archetype);
      });

    entity.destruct();
  }

  removeFromAll(
    term:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ) {
    this.makeAnyQuery(term)
      .matchingArchetypes()
      .forEach(([archetype, components]) => {
        this.storage.moveAllEntities(archetype, components);
        this.storage.cleanup(archetype);
      });
  }

  destructAllWith(
    x: Wildcard | Entity | Pair | [Entity | Wildcard, Entity | Wildcard],
  ) {
    const query = this.makeAnyQuery(x);

    const toBeDestructed = new Set<Entity>();

    query.each((entity) => toBeDestructed.add(entity));
    for (const entity of toBeDestructed) {
      this.destruct(entity);
    }
    query.forEachArchetype((archetype) => {
      this.storage.cleanup(archetype);
    });
  }

  clear(entity: Entity) {
    this.storage.clear(entity);
  }

  has(
    entity: Entity,
    term: Entity | Pair | Wildcard | [Entity | Wildcard, Entity | Wildcard],
  ) {
    if (!entity.isAlive()) return false;
    return this.makeAnyQuery(term).matches(entity.archetype);
  }

  remove(
    entity: Entity,
    removeTerm:
      | Entity
      | Pair
      | Wildcard
      | [Entity | Wildcard, Entity | Wildcard],
  ) {
    if (!entity.isAlive()) return;

    this.makeAnyQuery(removeTerm)
      .match(entity.archetype)
      .forEach((id) => {
        if (!this.has(entity, id)) return;

        this.operation.open(
          entity,
          { type: Storage.LinkType.Remove, id },
          (operation) => {
            if (operation.isRemoving(id)) return;

            operation.remove(id);
            operation.delete(id);

            id.runHooksFor(Phase.postRemove).on(entity);
          },
        );
      });
  }

  getComponents(
    entity: Entity,
    term?: Entity | Wildcard,
  ): IteratorObject<Entity>;
  getComponents(
    entity: Entity,
    term?: Pair | [Entity | Wildcard, Entity | Wildcard],
  ): IteratorObject<Pair>;
  getComponents(
    entity: Entity,
    term?: Entity | Wildcard | Pair | [Entity | Wildcard, Entity | Wildcard],
  ): IteratorObject<Entity | Pair>;
  getComponents(
    entity: Entity,
    term?: Entity | Pair | Wildcard | [Entity | Wildcard, Entity | Wildcard],
  ):
    | IteratorObject<Entity>
    | IteratorObject<Pair>
    | IteratorObject<Entity | Pair> {
    if (term === undefined) {
      return entity.archetype?.components.keys() ?? [][Symbol.iterator]();
    }
    return this.makeAnyQuery(term).match(entity.archetype!).keys();
  }

  findComponent(
    entity: Entity,
    term?: Entity | Pair | Wildcard | [Entity | Wildcard, Entity | Wildcard],
  ) {
    if (term === undefined) {
      return entity.archetype?.components.keys().next().value;
    }
    return this.makeAnyQuery(term).match(entity.archetype!).keys().next().value;
  }

  add(
    entity: Entity,
    id: Id,
    initialData: { data: unknown } | undefined = undefined,
  ) {
    if (this.has(entity, id)) return;
    this.checkValid(id);

    this.operation.open(
      entity,
      {
        type: Storage.LinkType.Add,
        id,
      },
      (operation) => {
        if (operation.isAdding(id)) return;

        // pre hooks
        id.runHooksFor(Phase.preAdd).on(entity);

        // add this
        operation.add(id);
        if (id.hasData()) {
          operation.set(id, id.tryInitialize(initialData));
        }

        // post hooks
        id.runHooksFor(Phase.postAdd).on(entity);
      },
    );
  }

  set(entity: Entity, id: Id, newVal: unknown) {
    if (!id.hasData()) {
      throw new Error(`"${this.getDisplayName(id)}" has no data to be set`);
    }

    if (!this.has(entity, id)) {
      this.add(entity, id, { data: newVal });
    } else {
      entity.set(id, id.tryInitialize({ data: newVal }));
    }
  }

  get(entity: Entity, id: Id) {
    return entity.get(id);
  }

  checkValid(id: Id) {
    if (id.isPair()) {
      if (!this.entities.has(id.relationship)) {
        throw new Error("Component does not exist in ECS");
      }

      if (!this.entities.has(id.target)) {
        throw new Error("Component does not exist in ECS");
      }
    } else {
      if (!this.entities.has(id)) {
        throw new Error("Component does not exist in ECS");
      }
    }
  }

  canDefaultInitialize(id: Id): boolean {
    return !id.hasData() || id.canDefaultInitialize();
  }

  addHook(
    phase: Phase,
    operation: Operation,
    query: Query<Entity | Pair>,
    callback: HookCallback,
  ) {
    query.forEachArchetype((archetype) => {
      archetype.addHook(phase, operation, callback);
    });
    this.storage.addNewArchetypeCallbacks.add((archetype) => {
      if (query.matches(archetype)) {
        archetype.addHook(phase, operation, callback);
      }
    });
  }

  addHookToEntity(
    phase: Phase,
    operation: Operation,
    entity: Entity,
    callback: HookCallback,
  ) {
    entity.addHook(phase, operation, callback);
  }

  makeAnyQuery = this.queryBuilder.buildAny.bind(this.queryBuilder);

  makeQuery = this.queryBuilder.build.bind(this.queryBuilder);
}

export type HookCallback = HookCallbackGeneric<Entity, Pair>;

export type Query<T> = Storage.Query<Archetype, Entity, Pair, T>;

export type Wildcard = Storage.Wildcard<Archetype, Entity, Pair>;

export function isWildcard(value: unknown): value is Wildcard {
  return Storage.isWildcard(value);
}
