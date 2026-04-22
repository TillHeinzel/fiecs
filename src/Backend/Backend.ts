import { ArchetypeGraph, ILogger, LinkType } from "./ArchetypeGraph";
import { AtomicOperationManager } from "./AtomicOperationManager";
import { Archetype, Entity, Pair } from "./BasicObjects";
import { ComponentIndex } from "./ComponentIndex/ComponentIndex";
import { HookCallback as HookCallbackGeneric, Operation, Phase } from "./Hooks";
import { NameMap } from "./NameMap";
import { mergeResults, Query, QueryBuilder, Wildcard } from "./Query";

export class Backend {
  private archetypeGraph = new ArchetypeGraph<Archetype, Entity, Pair>(
    Archetype,
    Entity,
    (components) =>
      components
        .keys()
        .map(
          (component) =>
            new Set(
              component.matchingArchetypes().map(([archetype]) => archetype),
            ),
        )
        .filter((setThisComponent) => setThisComponent !== undefined)
        .reduce((setOfArchetypes, setThisComponent) =>
          setOfArchetypes.intersection(setThisComponent),
        )
        .keys(),
  );
  private nameMap = new NameMap();
  private entities: Set<Entity> = new Set();
  private components: Map<unknown, Entity> = new Map();

  private operation = new AtomicOperationManager(this.archetypeGraph);

  private componentIndex = new ComponentIndex<Archetype, Entity, Pair>();
  private queryBuilder = new QueryBuilder(this.componentIndex);

  wildcard = this.componentIndex.wildcard;

  makeSingleTermQuery = this.queryBuilder.singleTerm.bind(this.queryBuilder);

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
    return (
      relationship.lookupPairWith(target) ?? new Pair({ relationship, target })
    );
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

    mergeResults([
      this.queryBuilder.singleTerm(entity).matchingArchetypes(),
      this.queryBuilder
        .singleTerm([entity, this.wildcard])
        .matchingArchetypes(),
      this.queryBuilder
        .singleTerm([this.wildcard, entity])
        .matchingArchetypes(),
    ])
      .entries()
      .forEach(([archetype, components]) => {
        this.archetypeGraph.moveAllEntities(archetype, components);
        this.archetypeGraph.cleanup(archetype);
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
    this.queryBuilder
      .singleTerm(term)
      .matchingArchetypes()
      .forEach(([archetype, components]) => {
        this.archetypeGraph.moveAllEntities(archetype, components);
        this.archetypeGraph.cleanup(archetype);
      });
  }

  destructAllWith(
    x:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ) {
    const query = this.queryBuilder.singleTerm(x);

    const toBeDestructed = new Set<Entity>();
    const toBeCleanedUp = new Set<Archetype>();

    query.matchingArchetypes().forEach(([archetype]) => {
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

  has(
    entity: Entity,
    term:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ) {
    if (!entity.isAlive()) return false;
    return this.queryBuilder.singleTerm(term).matches(entity.archetype);
  }

  remove(
    entity: Entity,
    removeTerm:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ) {
    if (!entity.isAlive()) return;

    this.queryBuilder
      .singleTerm(removeTerm)
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
    term?:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ):
    | IteratorObject<Entity>
    | IteratorObject<Pair>
    | IteratorObject<Entity | Pair> {
    if (term === undefined) {
      return entity.archetype?.components.keys() ?? [][Symbol.iterator]();
    }
    return this.queryBuilder.singleTerm(term).match(entity.archetype!).keys();
  }

  findComponent(
    entity: Entity,
    term?:
      | Wildcard
      | Entity
      | Pair
      | [Entity, Entity]
      | [Entity, Wildcard]
      | [Wildcard, Entity]
      | [Wildcard, Wildcard],
  ) {
    if (term === undefined) {
      return entity.archetype?.components.keys().next().value;
    }
    return this.queryBuilder
      .singleTerm(term)
      .match(entity.archetype!)
      .keys()
      .next().value;
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
    query: Query<Entity | Pair>,
    callback: HookCallback,
  ) {
    query.matchingArchetypes().forEach(([archetype]) => {
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
