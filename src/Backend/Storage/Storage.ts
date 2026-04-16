import { IStorageArchetype } from "./IArchetype";
import { IStorageEntity } from "./IEntity";
import { IStoragePair } from "./IPair";
import { LinkType, reverseLinkType } from "./Links";
import { Query, QueryBuilder } from "./Query";
import { Wildcard } from "./Wildcard";

export class ECSStorage<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  constructor(
    makeArchetype: {
      new (props: { components: ReadonlySet<Entity | Pair> }): Archetype;
    },
    makeEntity: { new (o: object): Entity },
    makePair: { new (props: { relationship: Entity; target: Entity }): Pair },
  ) {
    this.makeArchetype = makeArchetype;
    this.makeEntity = makeEntity;
    this.makePair = makePair;
    this.emptyArchetype = this.newArchetype(new Set());
    this.archetypes = new Set([this.emptyArchetype]);
  }

  makeArchetype;
  makeEntity;
  makePair;

  private newArchetype(components: ReadonlySet<Entity | Pair>) {
    return new this.makeArchetype({ components });
  }

  private newEntity() {
    const newEntity = new this.makeEntity({});
    this.emptyArchetype.entities.add(newEntity);
    newEntity.archetype = this.emptyArchetype;
    return newEntity;
  }

  private newPair(relationship: Entity, target: Entity) {
    return new this.makePair({ relationship, target });
  }

  private emptyArchetype: Archetype;
  private archetypes: Set<Archetype>;
  addNewArchetypeCallbacks: Set<(archetype: Archetype) => void> = new Set();

  wildcard = new Wildcard<Archetype, Entity, Pair>();

  queryBuilder = new QueryBuilder<Archetype, Entity, Pair>();

  #moveToArchetype(entity: Entity, newArchetype: Archetype) {
    entity.archetype?.entities.delete(entity);
    newArchetype.entities.add(entity);
    entity.archetype = newArchetype;
  }

  private getArchetype(components: ReadonlySet<Entity | Pair>) {
    return (
      this.#lookupArchetype(components) ?? this.#addNewArchetype(components)
    );
  }

  isAlive(entity: Entity) {
    return entity.archetype !== undefined;
  }

  createEntity() {
    const entity = this.newEntity();
    this.emptyArchetype.entities.add(entity);
    return entity;
  }

  ensurePair(relationship: Entity, target: Entity): Pair {
    const lookupExistingPair = () => {
      return relationship.lookupPairWith(target);
    };

    const createNewPair = () => {
      const newPair = this.newPair(relationship, target);

      relationship.getRelationshipWildcard().addPairBacklink(newPair);

      return newPair;
    };
    return lookupExistingPair() ?? createNewPair();
  }

  #lookupArchetype(components: ReadonlySet<Entity | Pair>) {
    if (this.#statistics) this.#statistics.expensiveLookups++;

    if (components.size === 0) {
      return this.emptyArchetype;
    }

    const setOfArchetypes = components
      .keys()
      .map((component) => new Set(component.getBacklinks()))
      .filter((setThisComponent) => setThisComponent !== undefined)
      .reduce((setOfArchetypes, setThisComponent) =>
        setOfArchetypes.intersection(setThisComponent),
      );

    if (setOfArchetypes === undefined) {
      return undefined;
    }

    for (const archetype of setOfArchetypes) {
      if (isSameSet(archetype.components, components)) {
        return archetype;
      }
    }
    return undefined;
  }

  #addNewArchetype(components: ReadonlySet<Entity | Pair>) {
    const newArchetype: Archetype = this.newArchetype(components);
    this.archetypes.add(newArchetype);

    this.wildcard.maybeAddBacklink(newArchetype);
    this.wildcard.doubleWildcard.maybeAddBacklink(newArchetype);
    for (const id of components) {
      id.addBacklink(newArchetype);
    }
    this.addNewArchetypeCallbacks.forEach((callback) => callback(newArchetype));
    return newArchetype;
  }

  moveToEmptyArchetype(entity: Entity) {
    entity.componentData.clear();
    this.#moveToArchetype(entity, this.emptyArchetype);
  }

  moveToDestructedArchetype(entity: Entity) {
    entity.componentData.clear();

    entity.archetype?.entities.delete(entity);
    // not actually added to the destructed archetype's entities set,
    // as this archetype is only used for destructed entities,
    // which should never be queried for.
    // This way, they can be cleaned up by GC
    entity.archetype = undefined;
  }

  set(entity: Entity, id: Entity | Pair, newVal: unknown) {
    entity.componentData.set(id, newVal);
  }

  has(
    entity: Entity,
    id:
      | Entity
      | Pair
      | Wildcard<Archetype, Entity, Pair>
      | [
          Entity | Wildcard<Archetype, Entity, Pair>,
          Entity | Wildcard<Archetype, Entity, Pair>,
        ],
  ) {
    if (!entity.isAlive()) return false;
    return this.queryBuilder.buildAny(id).matches(entity.archetype);
  }

  get(entity: Entity, id: Entity | Pair) {
    return entity.componentData.get(id);
  }

  private removeData(entity: Entity, id: Entity | Pair) {
    entity.componentData.delete(id);
  }

  moveToArchetype(
    entity: Entity,
    link: { type: LinkType; id: Entity | Pair },
    toAdd: Set<Entity | Pair>,
    toRemove: Set<Entity | Pair>,
  ) {
    if (!entity.isAlive()) return;

    if (toAdd.size === 0 && toRemove.size === 0) return;

    const lookupCheapLink = () => {
      return entity.archetype.links.get(link.type, link.id);
    };

    const establishNewLink = () => {
      const newArchetype = this.getArchetype(
        addAll(removeAll(entity.archetype.components, toRemove), toAdd),
      );

      entity.archetype.links.add(link.type, link.id, newArchetype);
      if (toAdd.size + toRemove.size === 1) {
        newArchetype.links.add(
          reverseLinkType(link.type),
          link.id,
          entity.archetype,
        );
      }

      return newArchetype;
    };
    this.#moveToArchetype(entity, lookupCheapLink() ?? establishNewLink());
    toRemove.forEach((id) => this.removeData(entity, id));
  }

  cleanup(archetype: Archetype) {
    if (archetype.entities.size === 0 && archetype !== this.emptyArchetype) {
      this.deleteArchetype(archetype);
    }
  }

  removeFromAll(
    queries: IteratorObject<Query<Archetype, Entity, Pair, Entity | Pair>>,
  ) {
    const archetypesToDelete = new Map<Archetype, Set<Entity | Pair>>();

    const addArchetypeToDelete = (
      archetype: Archetype,
      components: Set<Entity | Pair>,
    ) => {
      if (!archetypesToDelete.has(archetype)) {
        archetypesToDelete.set(archetype, new Set());
      }
      const existingSet = archetypesToDelete.get(archetype)!;
      components.forEach(existingSet.add.bind(existingSet));
    };

    queries.forEach((query) =>
      query.forEachArchetype((archetype, match) =>
        addArchetypeToDelete(archetype, match),
      ),
    );

    for (const [archetype, componentsToRemove] of archetypesToDelete) {
      this.removeComponentsFromArchetypeAndDeleteIt(
        archetype,
        componentsToRemove,
      );
    }
  }

  private removeComponentsFromArchetypeAndDeleteIt(
    archetype: Archetype,
    componentsToRemove: Set<Entity | Pair>,
  ) {
    if (componentsToRemove.size === 0)
      throw new Error("Internal: Can't remove 0 components from archetype");

    const archetypeToMoveEntitiesTo = (() => {
      if (componentsToRemove.size === 1) {
        const component = componentsToRemove.values().next().value!;
        const preppedLink = archetype.links.get(LinkType.Remove, component);
        if (preppedLink) return preppedLink;
      }

      return this.getArchetype(
        removeAll(archetype.components, componentsToRemove),
      );
    })();

    for (const entity of archetype.entities) {
      this.#moveToArchetype(entity, archetypeToMoveEntitiesTo);
      componentsToRemove.forEach((component) =>
        this.removeData(entity, component),
      );
    }

    this.deleteArchetype(archetype);
  }

  private deleteArchetype(archetype: Archetype) {
    this.archetypes.delete(archetype);

    archetype.detachConnections();
  }

  #statistics: { expensiveLookups: number } | undefined = undefined;

  startStatistics() {
    this.#statistics = { expensiveLookups: 0 };
  }

  stopStatistics() {
    this.#statistics = undefined;
  }

  getStatistics() {
    return this.#statistics;
  }

  getArchetypeCount() {
    return this.archetypes.size;
  }

  getLinkCount() {
    return this.archetypes
      .keys()
      .reduce((count, archetype) => count + archetype.links.count(), 0);
  }
}

function addAll<T>(archetype: ReadonlySet<T>, ids: Set<T>): ReadonlySet<T> {
  return archetype.union(ids);
}

function removeAll<T>(archetype: ReadonlySet<T>, ids: Set<T>): ReadonlySet<T> {
  return archetype.difference(ids);
}

function isSameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>) {
  return a.isSubsetOf(b) && b.isSubsetOf(a);
}
