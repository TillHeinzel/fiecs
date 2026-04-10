import { Archetype } from "./Archetype";
import { Entity, Id } from "./EntityData";
import { LinkType } from "./Hooks";
import { reverseLinkType } from "./Links";

export class ECSStorage {
  emptyArchetype: Archetype = new Archetype(new Set());

  // not added to archetypes set,
  // as this archetype is only used for destructed entities,
  // which should never be queried for
  destructedArchetype: Archetype = new Archetype(new Set());

  archetypes = new Set<Archetype>([this.emptyArchetype]);

  addNewArchetypeCallbacks: Set<(archetype: Archetype) => void> = new Set();

  #moveToArchetype(entity: Entity, newArchetype: Archetype) {
    entity.archetype.entities.delete(entity);
    newArchetype.entities.add(entity);
    entity.archetype = newArchetype;
  }

  getArchetype(components: ReadonlySet<Id>) {
    return (
      this.#lookupArchetype(components) ?? this.#addNewArchetype(components)
    );
  }

  #lookupArchetype(components: ReadonlySet<Id>) {
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

  #addNewArchetype(components: ReadonlySet<Id>) {
    const newArchetype: Archetype = new Archetype(components);
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

  moveToArchetype(
    entity: Entity,
    link: { type: LinkType; id: Id },
    toAdd: Set<Id>,
    toRemove: Set<Id>,
  ) {
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
  }

  removeComponentsFromArchetypeAndDeleteIt(
    archetype: Archetype,
    componentsToRemove: Set<Id>,
  ) {
    const archetypeToMoveEntitiesTo = (() => {
      if (componentsToRemove.size === 0) return archetype;

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
        entity.componentData.delete(component),
      );
    }

    this.deleteArchetype(archetype);
  }

  deleteArchetype(archetype: Archetype) {
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

function addAll(archetype: ReadonlySet<Id>, ids: Set<Id>): ReadonlySet<Id> {
  return archetype.union(ids);
}

function removeAll(archetype: ReadonlySet<Id>, ids: Set<Id>): ReadonlySet<Id> {
  return archetype.difference(ids);
}

function isSameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>) {
  return a.isSubsetOf(b) && b.isSubsetOf(a);
}
