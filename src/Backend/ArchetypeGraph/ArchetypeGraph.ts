import { IArchetype, IEntity } from "./IArchetype";
import { ILogger } from "./ILogger";
import { LinkType, reverseLinkType } from "./Links";

export class ArchetypeGraph<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair,
> {
  constructor(
    makeArchetype: {
      new (props: { components: ReadonlySet<Entity | Pair> }): Archetype;
    },
    makeEntity: { new (o: object): Entity },
    query: (
      components: ReadonlySet<Entity | Pair>,
    ) => IteratorObject<Archetype>,
    logger: ILogger = new NullLogger(),
  ) {
    this.makeArchetype = makeArchetype;
    this.makeEntity = makeEntity;
    this.emptyArchetype = this.newArchetype(new Set());
    this.query = query;
    this.logger = logger;
    logger.addArchetype(this.emptyArchetype);
  }

  makeArchetype;
  makeEntity;
  query: (components: ReadonlySet<Entity | Pair>) => IteratorObject<Archetype>;

  private newArchetype(components: ReadonlySet<Entity | Pair>) {
    return new this.makeArchetype({ components });
  }

  private newEntity() {
    const newEntity = new this.makeEntity({});
    newEntity.moveToArchetype(this.emptyArchetype, new Set());
    return newEntity;
  }

  private emptyArchetype: Archetype;
  addNewArchetypeCallbacks: Set<(archetype: Archetype) => void> = new Set();
  deleteArchetypeCallbacks: Set<(archetype: Archetype) => void> = new Set();

  private getArchetype(components: ReadonlySet<Entity | Pair>) {
    return (
      this.#lookupArchetype(components) ?? this.#addNewArchetype(components)
    );
  }

  createEntity() {
    const entity = this.newEntity();
    this.emptyArchetype.entities.add(entity);
    return entity;
  }

  #lookupArchetype(components: ReadonlySet<Entity | Pair>) {
    this.logger.doExpensiveLookup();

    if (components.size === 0) {
      return this.emptyArchetype;
    }

    const setOfArchetypes = this.query(components);

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
    this.logger.addArchetype(newArchetype);

    this.addNewArchetypeCallbacks.forEach((callback) => callback(newArchetype));
    return newArchetype;
  }

  clear(entity: Entity) {
    if (!entity.isAlive()) return;
    entity.moveToArchetype(this.emptyArchetype, entity.archetype.components);
  }

  moveToArchetype(
    entity: Entity,
    link: { type: LinkType; id: Entity | Pair },
    toAdd: Set<Entity | Pair>,
    toRemove: Set<Entity | Pair>,
  ) {
    if (!entity.isAlive()) return;

    if (toAdd.size === 0 && toRemove.size === 0) return;

    entity.moveToArchetype(
      this.ensureArchetypeWithLink(entity.archetype, link, toAdd, toRemove),
      toRemove,
    );
  }

  private ensureArchetypeWithLink(
    archetype: Archetype,
    link: { type: LinkType; id: Entity | Pair },
    toAdd: Set<Entity | Pair>,
    toRemove: Set<Entity | Pair>,
  ) {
    const lookupCheapLink = () => {
      return archetype.links.get(link.type, link.id);
    };

    const establishNewLink = () => {
      const newArchetype = this.getArchetype(
        addAll(removeAll(archetype.components, toRemove), toAdd),
      );

      const newLink = archetype.links.add(link.type, link.id, newArchetype);
      this.logger.addLink(newLink);
      if (toAdd.size + toRemove.size === 1) {
        const reverseLink = newArchetype.links.add(
          reverseLinkType(link.type),
          link.id,
          archetype,
        );
        this.logger.addLink(reverseLink);
      }

      return newArchetype;
    };
    return lookupCheapLink() ?? establishNewLink();
  }

  cleanup(archetype: Archetype) {
    if (archetype.entities.size === 0 && archetype !== this.emptyArchetype) {
      this.deleteArchetype(archetype);
    }
  }

  moveAllEntities(
    archetype: Archetype,
    componentsToRemove: Set<Entity | Pair>,
  ) {
    if (componentsToRemove.size === 0)
      throw new Error("Internal: Can't remove 0 components from archetype");

    const archetypeToMoveEntitiesTo = this.getArchetypeWithoutComponents(
      archetype,
      componentsToRemove,
    );

    for (const entity of archetype.entities) {
      entity.moveToArchetype(archetypeToMoveEntitiesTo, componentsToRemove);
    }
  }

  private getArchetypeWithoutComponents(
    archetype: Archetype,
    componentsToRemove: Set<Entity | Pair>,
  ) {
    if (componentsToRemove.size === 1) {
      const component = componentsToRemove.values().next().value!;
      const preppedLink = archetype.links.get(LinkType.Remove, component);
      if (preppedLink) return preppedLink;
    }

    return this.getArchetype(
      removeAll(archetype.components, componentsToRemove),
    );
  }

  private deleteArchetype(archetype: Archetype) {
    if (archetype.entities.size > 0) {
      throw new Error(
        "Internal: Cannot detach connections of an archetype that still has entities",
      );
    }

    archetype.links.detachLinks(this.logger);
    this.deleteArchetypeCallbacks.forEach((callback) => callback(archetype));

    this.logger.deleteArchetype(archetype);
  }

  private logger: ILogger = new NullLogger();

  startStatistics(logger: ILogger) {
    this.logger = logger;
  }

  stopStatistics() {
    this.logger = new NullLogger();
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

class NullLogger implements ILogger {
  addArchetype(): void {}
  deleteArchetype(): void {}
  addLink(): void {}
  deleteLink(): void {}
  doExpensiveLookup(): void {}
}
