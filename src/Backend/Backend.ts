import { ArchetypeGraph, ILogger, LinkType } from "./ArchetypeGraph";
import { AtomicOperationManager } from "./AtomicOperationManager";
import { Archetype, Entity, Pair } from "./BasicObjects";
import * as ComponentIndex from "./ComponentIndex";
import { HookCallback as HookCallbackGeneric, Operation, Phase } from "./Hooks";
import { NameMap } from "./NameMap";
import { PairsManager } from "./PairsManager";
import { and, or, Query, QueryBuilder, SingleTerm } from "./Query";

export class Backend {
  private nameMap = new NameMap();
  private entities: Set<Entity> = new Set();
  private components: Map<unknown, Entity> = new Map();

  private pairsManager = new PairsManager<Archetype, Entity, Pair>(Pair);

  private componentIndex = new ComponentIndex.ComponentIndex<
    Archetype,
    Entity,
    Pair
  >(this.pairsManager);
  queryBuilder = new QueryBuilder(this.componentIndex);
  private archetypeGraph = new ArchetypeGraph<Archetype, Entity, Pair>(
    Archetype,
    Entity,
    (components) =>
      this.queryBuilder.build(and(...components)).matchingArchetypes(),
  );
  private operation = new AtomicOperationManager(this.archetypeGraph);

  wildcard = this.componentIndex.wildcard;
  doubleWildcard = this.componentIndex.doubleWildcard;

  makeQuery = this.queryBuilder.build.bind(this.queryBuilder);

  constructor() {
    this.archetypeGraph.addNewArchetypeCallbacks.add((newArchetype) => {
      this.componentIndex.addArchetype(newArchetype);
    });

    this.archetypeGraph.deleteArchetypeCallbacks.add((archetype) => {
      this.componentIndex.removeArchetype(archetype);
    });
  }

  private createEntity() {
    const newEntity = this.archetypeGraph.createEntity();
    this.entities.add(newEntity);

    return newEntity;
  }

  startStatistics(logger: ILogger) {
    this.archetypeGraph.startStatistics(logger);
  }

  stopStatistics() {
    this.archetypeGraph.stopStatistics();
  }

  entity(name?: string) {
    const createEntity = () => {
      const newEntity = this.createEntity();
      if (name !== undefined) this.setName(newEntity, name);
      return newEntity;
    };

    return this.nameMap.lookup(name) ?? createEntity();
  }

  tag(name?: string) {
    return this.entity(name);
  }

  component(parse: { parse: (val: unknown) => unknown }) {
    const createComponent = () => {
      const newComponent = this.createEntity();

      newComponent.addDataInitializer(parse);
      this.components.set(parse, newComponent);

      return newComponent;
    };

    return this.components.get(parse) ?? createComponent();
  }

  pair(relationship: Entity, target: Entity) {
    return this.pairsManager.ensurePair(relationship, target);
  }

  relationshipWildcard(relationship: Entity) {
    return relationship.getRelationshipWildcard();
  }

  wildcardTarget(target: Entity) {
    return target.getWildcardTarget();
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

  getDisplayName(id: Entity | Pair): string {
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

    this.queryBuilder
      .build(
        or(
          entity,
          this.relationshipWildcard(entity),
          this.wildcardTarget(entity),
        ),
      )
      .archetypesWithMatches()
      .forEach(([archetype, components]) => {
        this.archetypeGraph.moveAllEntities(archetype, components);
        this.archetypeGraph.cleanup(archetype);
      });

    entity.destruct();
  }

  removeFromAll(term: SingleTerm) {
    const query = this.queryBuilder.build(term);

    query.matchingArchetypes().forEach((archetype) => {
      this.archetypeGraph.moveAllEntities(archetype, query.match(archetype));
      this.archetypeGraph.cleanup(archetype);
    });
  }

  destructAllWith(x: SingleTerm) {
    const query = this.queryBuilder.build(x);

    const toBeDestructed = new Set<Entity>();
    const toBeCleanedUp = new Set<Archetype>();

    query.matchingArchetypes().forEach((archetype) => {
      archetype.entities.forEach((entity) => toBeDestructed.add(entity));
      toBeCleanedUp.add(archetype);
    });

    for (const entity of toBeDestructed) {
      this.destruct(entity);
    }
    for (const archetype of toBeCleanedUp) {
      this.archetypeGraph.cleanup(archetype);
    }
  }

  clear(entity: Entity) {
    this.archetypeGraph.clear(entity);
  }

  has(entity: Entity, term: SingleTerm) {
    if (!entity.isAlive()) return false;
    return this.queryBuilder.build(term).matches(entity.archetype);
  }

  remove(entity: Entity, removeTerm: SingleTerm) {
    if (!entity.isAlive()) return;

    this.queryBuilder
      .build(removeTerm)
      .match(entity.archetype)
      .forEach((id) => {
        if (!this.has(entity, id)) return;

        this.operation.open(
          entity,
          { type: LinkType.Remove, id },
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
    term?: SingleTerm,
  ):
    | IteratorObject<Entity>
    | IteratorObject<Pair>
    | IteratorObject<Entity | Pair> {
    if (term === undefined) {
      return entity.archetype?.components.keys() ?? [][Symbol.iterator]();
    }
    return this.queryBuilder.build(term).match(entity.archetype!).keys();
  }

  findComponent(entity: Entity, term?: SingleTerm) {
    if (term === undefined) {
      return entity.archetype?.components.keys().next().value;
    }
    return this.queryBuilder.build(term).match(entity.archetype!).keys().next()
      .value;
  }

  add(
    entity: Entity,
    id: Entity | Pair,
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

  set(entity: Entity, id: Entity | Pair, newVal: unknown) {
    if (!id.hasData()) {
      throw new Error(`"${this.getDisplayName(id)}" has no data to be set`);
    }

    if (!this.has(entity, id)) {
      this.add(entity, id, { data: newVal });
    } else {
      entity.set(id, id.tryInitialize({ data: newVal }));
    }
  }

  get(entity: Entity, id: Entity | Pair) {
    return entity.get(id);
  }

  checkValid(id: Entity | Pair) {
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

  canDefaultInitialize(id: Entity | Pair): boolean {
    return !id.hasData() || id.canDefaultInitialize();
  }

  addHook(
    phase: Phase,
    operation: Operation,
    query: Query,
    callback: HookCallback,
  ) {
    query.matchingArchetypes().forEach((archetype) => {
      archetype.addHook(phase, operation, callback);
    });
    this.archetypeGraph.addNewArchetypeCallbacks.add((archetype) => {
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
