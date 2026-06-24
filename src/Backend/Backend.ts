import { ImmutableMap } from "#/Utility/ImmutableMap";

import { ArchetypeGraph, ILogger, LinkType } from "./ArchetypeGraph";
import { AtomicOperationManager } from "./AtomicOperationManager";
import {
  Archetype,
  BasicTermInput,
  DoubleWildcard,
  Entity,
  IndexedTerm,
  isDoubleWildcard,
  isEntity,
  isIndexedTerm,
  isRelationshipWildcard,
  isStringlookup,
  isStringLookupPairTermInput,
  isVariable,
  isVariableImplicitPairTermInput,
  isWildcard,
  isWildcardTarget,
  Pair,
  RelationshipWildcard,
  Wildcard,
  WildcardTarget,
} from "./BasicTypes";
import { addBuiltinTraits } from "./builtinTraits";
import * as ComponentIndex from "./ComponentIndex";
import { HookCallback as HookCallbackGeneric, Operation, Phase } from "./Hooks";
import { NameMap } from "./NameMap";
import { PairsManager } from "./PairsManager";
import {
  CacheStrategy,
  getSource,
  indexedQueryTerm,
  makeQuery,
  notTerm,
  oneOf,
  OneOf,
  optionalTerm,
  SimpleOneOf,
  SimpleQuery,
  SourceType,
  stringLookupPairQueryTerm,
  stringLookupQueryTerm,
  Term,
  variablePairQueryTerm,
  variableQueryTerm,
  VariableValue,
} from "./Query";

export class Backend {
  private nameMap = new NameMap();
  private entities: Set<Entity> = new Set();
  private components: Map<unknown, Entity> = new Map();

  pairsManager = new PairsManager<Archetype, Entity, Pair>(Pair);

  private componentIndex = new ComponentIndex.ComponentIndex<
    Archetype,
    Entity,
    Pair
  >(this.pairsManager);
  private archetypeGraph = new ArchetypeGraph<Archetype, Entity, Pair>(
    Archetype,
    Entity,
    (components) => new SimpleQuery(components).matchingArchetypes(),
  );
  private operation = new AtomicOperationManager(this.archetypeGraph);

  wildcard = this.componentIndex.wildcard;
  doubleWildcard = this.componentIndex.doubleWildcard;

  builtin: ReturnType<typeof addBuiltinTraits>;

  constructor() {
    this.addNewArchetypeCallback((newArchetype) => {
      this.componentIndex.addArchetype(newArchetype);
    });

    this.archetypeGraph.deleteArchetypeCallbacks.add((archetype) => {
      this.componentIndex.removeArchetype(archetype);
    });

    this.builtin = addBuiltinTraits(this);
  }

  addNewArchetypeCallback(callback: (a: Archetype) => void) {
    this.archetypeGraph.addNewArchetypeCallbacks.add(callback);
  }

  private createEntity() {
    const newEntity = this.archetypeGraph.createEntity();
    this.entities.add(newEntity);

    return newEntity;
  }

  getAllArchetypes() {
    return this.archetypeGraph.getAllArchetypes();
  }

  lookupPairIndex(
    first: Entity | Wildcard,
    second: Entity | Wildcard,
  ): Pair | WildcardTarget | RelationshipWildcard | DoubleWildcard {
    if (isEntity(first)) {
      if (isEntity(second)) return this.pair(first, second);
      if (isWildcard(second)) return this.relationshipWildcard(first);
    }
    if (isWildcard(first)) {
      if (isEntity(second)) return this.wildcardTarget(second);
      if (isWildcard(second)) return this.doubleWildcard;
    }

    throw new Error("internal: types f'ed up somehow?");
  }

  startStatistics(logger: ILogger) {
    this.archetypeGraph.startStatistics(logger);
  }

  stopStatistics() {
    this.archetypeGraph.stopStatistics();
  }

  entity(name?: string) {
    const createEntity = (name?: string) => {
      const newEntity = this.createEntity();
      if (name !== undefined) this.setName(newEntity, name);
      return newEntity;
    };

    return this.nameMap.lookup(name) ?? createEntity(name);
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
    if (entity.name === name) return;

    if (this.nameMap.hasLookupName(name)) {
      throw new Error(`Entity with name ${name} already exists`);
    }

    this.nameMap.setLookupName(entity, name);
    entity.name = name;
  }

  getDisplayName(
    id:
      | Entity
      | Pair
      | Wildcard
      | RelationshipWildcard
      | WildcardTarget
      | DoubleWildcard,
  ): string {
    if (isWildcard(id)) return "*";
    if (isDoubleWildcard(id)) return `(*,*)`;
    if (isRelationshipWildcard(id)) return `(${id.relationship.getName()},*)`;
    if (isWildcardTarget(id)) return `(*,${id.target.getName()})`;
    return id.getName();
  }

  tablesLocked: boolean = false;

  lockTables() {
    this.tablesLocked = true;
  }

  unlockTables() {
    this.tablesLocked = false;
  }

  tablesAreLocked() {
    return this.tablesLocked;
  }

  lockedRun(f: () => void) {
    this.lockTables();

    try {
      f();
    } finally {
      this.unlockTables();
    }
  }

  lookupEntity(name: string) {
    return this.nameMap.lookup(name);
  }

  isAlive(entity: Entity) {
    return entity.isAlive();
  }

  destruct(entity: Entity) {
    this.checkTablesLocked();
    if (entity.hasData()) {
      throw new Error("Components cannot be destructed (by default)");
    }

    if (entity.name) {
      this.nameMap.deleteName(entity.name);
    }
    entity.name = undefined;
    this.entities.delete(entity);

    new SimpleOneOf([
      entity,
      this.relationshipWildcard(entity),
      this.wildcardTarget(entity),
    ])
      .archetypesWithMatches()
      .entries()
      .forEach(([archetype, match]) => {
        this.archetypeGraph.moveAllEntities(archetype, match);
        this.archetypeGraph.cleanup(archetype);
      });

    entity.destruct();
  }

  removeFromAll(term: IndexedTerm) {
    this.checkTablesLocked();

    term
      .archetypesWithMatches()
      .entries()
      .forEach(([archetype, match]) => {
        this.archetypeGraph.moveAllEntities(archetype, match);
        this.archetypeGraph.cleanup(archetype);
      });
  }

  destructAllWith(x: IndexedTerm) {
    const toBeDestructed = new Set<Entity>();
    const toBeCleanedUp = new Set<Archetype>();

    x.archetypesWithMatches()
      .keys()
      .forEach((archetype) => {
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
    this.checkTablesLocked();
    this.archetypeGraph.clear(entity);
  }

  has(entity: Entity, term: IndexedTerm) {
    if (!entity.isAlive()) return false;
    return term.matches(entity.archetype);
  }

  checkTablesLocked() {
    if (this.tablesLocked) throw new Error("Tables locked");
  }

  remove(entity: Entity, removeTerm: IndexedTerm) {
    if (!entity.isAlive()) return;
    this.checkTablesLocked();

    const match = removeTerm
      .archetypesWithMatches()
      .entries()
      .find(([archetype]) => archetype === entity.archetype);

    if (match === undefined) return;

    match[1].keys().forEach((id) => {
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
    term?: IndexedTerm,
  ):
    | IteratorObject<Entity>
    | IteratorObject<Pair>
    | IteratorObject<Entity | Pair> {
    if (term === undefined) {
      return entity.archetype?.components.keys() ?? [][Symbol.iterator]();
    }

    const match = term
      .archetypesWithMatches()
      .entries()
      .find(([archetype]) => archetype === entity.archetype);

    if (match === undefined) return [].values();

    return match[1].keys();
  }

  findComponent(entity: Entity, term?: IndexedTerm) {
    if (term === undefined) {
      return entity.archetype?.components.keys().next().value;
    }

    const match = term
      .archetypesWithMatches()
      .entries()
      .find(([archetype]) => archetype === entity.archetype);

    if (match === undefined) return undefined;

    return match[1].keys().next().value;
  }

  add(
    entity: Entity,
    id: Entity | Pair,
    initialData: { data: unknown } | undefined = undefined,
  ) {
    if (this.has(entity, id)) return;
    this.checkValid(id);
    if (this.tablesLocked) throw new Error("Tables locked");

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

  getParent(entity: Entity) {
    return (
      this.findComponent(
        entity,
        this.relationshipWildcard(this.builtin.ChildOf),
      ) as Pair | undefined
    )?.target;
  }

  getChildren(entity: Entity) {
    return this.pair(this.builtin.ChildOf, entity)
      .archetypesWithMatches()
      .keys()
      .flatMap((archetype) => archetype.entities.keys());
  }

  getRootObjects(): IteratorObject<Entity> {
    const matcher = this.relationshipWildcard(this.builtin.ChildOf);

    return this.archetypeGraph
      .getAllArchetypes()
      .filter((a) => !matcher.matches(a))
      .flatMap((archetype) => archetype.entities.keys());
  }

  getPath(entity: Entity): string {
    const parent = this.getParent(entity);

    const prefix = parent ? this.getPath(parent) + "::" : "";

    return prefix + (entity.name ?? "-unnamed-");
  }

  // only intended to be called from the hook when adding a ChildOf relationship
  setLookupPath(entity: Entity, path: string) {
    this.nameMap.setLookupName(entity, path);
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

  query(
    terms: (Term | OneOf)[],
    cacheStrategy: CacheStrategy,
    initialQueryVariables = new ImmutableMap<string, VariableValue>(),
  ) {
    return makeQuery(
      terms,
      cacheStrategy,
      (f) => {
        this.addNewArchetypeCallback(f);
      },
      initialQueryVariables,
    );
  }

  basicQueryTerm(
    termInput: BasicTermInput,
    returnsMatch: boolean,
    source: SourceType,
  ) {
    if (isIndexedTerm(termInput)) {
      return indexedQueryTerm(termInput, returnsMatch, getSource(source));
    }

    if (isStringlookup(termInput)) {
      return stringLookupQueryTerm(termInput, returnsMatch, getSource(source));
    }

    if (isStringLookupPairTermInput(termInput)) {
      return stringLookupPairQueryTerm(
        termInput,
        returnsMatch,
        getSource(source),
        this,
      );
    }

    if (isVariable(termInput)) {
      return variableQueryTerm(
        termInput,
        returnsMatch,
        getSource(source),
        this,
      );
    }

    if (isVariableImplicitPairTermInput(termInput)) {
      return variablePairQueryTerm(
        termInput,
        returnsMatch,
        getSource(source),
        this,
      );
    }

    throw new Error("internal: I've made mistakes (obviously)");
  }

  notQueryTerm(term: Term) {
    return notTerm(term, this);
  }

  optionalQueryTerm(term: Term) {
    return optionalTerm(term, this);
  }

  oneOfQueryTerm(terms: Term[]) {
    return oneOf(terms);
  }

  addHook(
    phase: Phase,
    operation: Operation,
    query:
      | Entity
      | Wildcard
      | WildcardTarget
      | RelationshipWildcard
      | DoubleWildcard,
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

  getEntitiesIterator() {
    return this.entities.values();
  }

  allArchetypes() {
    return this.archetypeGraph.getAllArchetypes();
  }
}

export type HookCallback = HookCallbackGeneric<Entity, Pair>;
