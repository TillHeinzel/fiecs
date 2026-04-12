import { IArchetype } from "./IArchetype";
import { IEntity, IPair, isAlive } from "./IEntity";
import { LinkType, reverseLinkType } from "./Links";

export class ECSStorage<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  constructor(
    makeArchetype: { new (components: ReadonlySet<Entity | Pair>): Archetype },
    makeEntity: { new (): Entity },
  ) {
    this.makeArchetype = makeArchetype;
    this.makeEntity = makeEntity;
    this.emptyArchetype = this.newArchetype(new Set());
    this.destructedArchetype = this.newArchetype(new Set());
    this.archetypes = new Set([this.emptyArchetype]);
  }

  makeArchetype;
  makeEntity;

  newArchetype(components: ReadonlySet<Entity | Pair>) {
    return new this.makeArchetype(components);
  }

  newEntity() {
    const newEntity = new this.makeEntity();
    this.emptyArchetype.entities.add(newEntity);
    newEntity.archetype = this.emptyArchetype;
    return newEntity;
  }

  emptyArchetype: Archetype;
  destructedArchetype: Archetype;
  archetypes: Set<Archetype>;
  addNewArchetypeCallbacks: Set<(archetype: Archetype) => void> = new Set();

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

  #lookupArchetype(components: ReadonlySet<Entity | Pair>) {
    if (this.#statistics) this.#statistics.expensiveLookups++;

    if (components.size === 0) {
      return this.emptyArchetype;
    }

    const setOfArchetypes = components
      .keys()
      .map((component) => component.backLinksComponent)
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
    for (const id of components) {
      if (id.backLinksComponent === undefined) {
        id.backLinksComponent = new Set();
      }
      id.backLinksComponent.add(newArchetype);
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

  has(entity: Entity, id: Entity | Pair) {
    if (!isAlive(entity)) return false;
    return entity.archetype.components.has(id);
  }

  get(entity: Entity, id: Entity | Pair) {
    return entity.componentData.get(id);
  }

  remove(entity: Entity, id: Entity | Pair) {
    entity.componentData.delete(id);
  }

  moveToArchetype(
    entity: Entity,
    link: { type: LinkType; id: Entity | Pair },
    toAdd: Set<Entity | Pair>,
    toRemove: Set<Entity | Pair>,
  ) {
    if (!isAlive(entity)) return;

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
    toRemove.forEach((id) => this.remove(entity, id));
  }

  destructAllWith(id: Entity | Pair, destructEntity: (entity: Entity) => void) {
    if (id.backLinksComponent === undefined) return;

    id.backLinksComponent
      .keys()
      .flatMap((archetype) => archetype.entities.keys())
      .forEach((entity) => destructEntity(entity));

    id.backLinksComponent.forEach((archetype) =>
      this.deleteArchetype(archetype),
    );
  }

  cleanup(archetype: Archetype) {
    if (archetype.entities.size === 0 && archetype !== this.emptyArchetype) {
      this.deleteArchetype(archetype);
    }
  }

  removeFromAll(id: Entity | Pair) {
    if (id.backLinksComponent === undefined) return;

    for (const archetype of id.backLinksComponent) {
      this.removeComponentsFromArchetypeAndDeleteIt(archetype, new Set([id]));
    }
  }

  removeFromAllAdd(
    id: Entity | Pair,
    addToRemove: (archetype: Archetype, component: Entity | Pair) => void,
  ) {
    if (id.backLinksComponent === undefined) return;

    for (const archetype of id.backLinksComponent) {
      addToRemove(archetype, id);
    }
  }

  removeFromAllAsRelationshipAdd(
    entity: Entity,
    addToRemove: (archetype: Archetype, component: Entity | Pair) => void,
  ) {
    if (entity.backLinksRelationship === undefined) return;

    entity.backLinksRelationship.forEach((pair) => {
      pair.backLinksComponent.forEach((archetype) => {
        addToRemove(archetype, pair);
      });
    });
  }

  removeFromAllAsTargetAdd(
    entity: Entity,
    addToRemove: (archetype: Archetype, component: Entity | Pair) => void,
  ) {
    if (entity.backLinksTarget === undefined) return;
    entity.backLinksTarget.forEach((pair) => {
      pair.backLinksComponent.forEach((archetype) => {
        addToRemove(archetype, pair);
      });
    });
  }

  removeFromAllFull(entity: Entity) {
    const archetypesToDelete = new Map<Archetype, Set<Entity | Pair>>();

    const addArchetypeToDelete = (
      archetype: Archetype,
      component: Entity | Pair,
    ) => {
      if (!archetypesToDelete.has(archetype)) {
        archetypesToDelete.set(archetype, new Set());
      }
      archetypesToDelete.get(archetype)!.add(component);
    };

    this.removeFromAllAdd(entity, addArchetypeToDelete);
    this.removeFromAllAsRelationshipAdd(entity, addArchetypeToDelete);
    this.removeFromAllAsTargetAdd(entity, addArchetypeToDelete);

    for (const [archetype, componentsToRemove] of archetypesToDelete) {
      this.removeComponentsFromArchetypeAndDeleteIt(
        archetype,
        componentsToRemove,
      );
    }
  }

  removeComponentsFromArchetypeAndDeleteIt(
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
      componentsToRemove.forEach((component) => this.remove(entity, component));
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
