import { AtomicOperationManager } from "./AtomicOperationManager";
import { Archetype, Entity, Id, Pair } from "./BasicObjects";
import { HookCallback as HookCallbackGeneric, Operation, Phase } from "./Hooks";
import { NameMap } from "./NameMap";
import { makeQuery, Query } from "./Query";
import { ECSStorage, LinkType } from "./Storage";

export class Backend {
  storage = new ECSStorage(Archetype, Entity, Pair);
  nameMap = new NameMap();
  entities: Set<Entity> = new Set();
  components: Map<unknown, Entity> = new Map();

  private operation = new AtomicOperationManager(this.storage);

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
    return this.storage.ensurePair(relationship, target);
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
    return this.storage.isAlive(entity);
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

    this.storage.moveToDestructedArchetype(entity);

    this.storage.removeFromAllFull(entity);
  }

  removeFromAll(id: Id) {
    this.storage.removeFromAll(id);
  }

  destructAllWith(id: Id) {
    const query = makeQuery(id);

    query.each((entity) => this.destruct(entity));
    query.forEachArchetype((archetype) => {
      this.storage.cleanup(archetype);
    });
  }

  clear(entity: Entity) {
    this.storage.moveToEmptyArchetype(entity);
  }

  has(entity: Entity, component: Id) {
    return this.storage.has(entity, component);
  }

  remove(entity: Entity, id: Id) {
    this.checkValid(id);

    if (!this.has(entity, id)) return;

    this.operation.open(entity, { type: LinkType.Remove, id }, (operation) => {
      if (operation.isRemoving(id)) return;

      operation.remove(id);
      operation.delete(id);

      id.runHooksFor(Phase.postRemove).on(entity);
    });
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
        type: LinkType.Add,
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
      this.storage.set(entity, id, id.tryInitialize({ data: newVal }));
    }
  }

  get(entity: Entity, id: Id) {
    return this.storage.get(entity, id);
  }

  hasAnyRelationship(entity: Entity, relationship: Entity) {
    return entity.hasAnyRelationship(relationship);
  }

  getRelationshipTargets(entity: Entity, relationship: Entity): Set<Entity> {
    return new Set(
      Array.from(entity.getRelationshipPairs(relationship)).map(
        (pair) => pair.target,
      ),
    );
  }

  getARelationshipTarget(
    entity: Entity,
    relationship: Entity,
  ): Entity | undefined {
    return entity.getARelationshipPair(relationship)?.target;
  }

  getARelationshipPair(entity: Entity, relationship: Entity): Pair | undefined {
    return entity.getARelationshipPair(relationship);
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
    query: Query,
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
}

export type HookCallback = HookCallbackGeneric<Entity, Pair>;
