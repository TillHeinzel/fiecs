import { AtomicOperationManager } from "./AtomicOperationManager";
import { Archetype } from "./Core/Archetype";
import {
  canDefaultInitialize,
  Entity,
  getARelationshipTarget,
  getName,
  getRelationshipTargets,
  has,
  hasData,
  Id,
  Initializer,
  isPair,
  Pair,
} from "./Core/EntityData";
import {
  ComponentHookCallback,
  LinkType,
  Operation,
  Phase,
  RelationshipHookCallback,
  runAllHooks,
} from "./Core/Hooks";
import { ECSStorage } from "./Core/Storage";
import { ensureRelationshipId } from "./ensureRelationshipId";
import { NameMap } from "./NameMap";
import { Query } from "./Query";

export class Backend {
  storage: ECSStorage = new ECSStorage();
  nameMap = new NameMap();
  entities: Set<Entity> = new Set();

  private operation = new AtomicOperationManager(this.storage);

  createEntity(name?: string) {
    if (name !== undefined && this.nameMap.hasLookupName(name)) {
      throw new Error(`Entity with name ${name} already exists`);
    }

    const newEntity = new Entity(this.storage.emptyArchetype);
    this.storage.emptyArchetype.entities.add(newEntity);
    this.entities.add(newEntity);

    if (name !== undefined) this.setName(newEntity, name);

    return newEntity;
  }

  createTag(name?: string) {
    return this.createEntity(name);
  }

  createComponent(parse: (val: unknown) => unknown) {
    const newComponent = this.createEntity();

    newComponent.initializer = (() => {
      if (parse === undefined) return undefined;

      const initializer: Initializer = {
        initialize: (val: unknown) => {
          try {
            return parse(val);
          } catch {
            throw new Error("Invalid component data");
          }
        },
      };

      initializer.defaultInitialize = () => parse(undefined);

      try {
        parse(undefined);
      } catch {
        delete initializer.defaultInitialize;
      }

      return initializer;
    })();

    return newComponent;
  }

  makeExplicitRelationship(type: Entity, target: Entity) {
    this.#checkValid(type);
    this.#checkValid(target);
    return ensureRelationshipId(type, target);
  }

  relationship(relationship: Entity, target: Entity) {
    return ensureRelationshipId(relationship, target);
  }

  getName(entity: Entity) {
    return getName(entity);
  }

  setName(entity: Entity, name: string) {
    if (this.nameMap.hasLookupName(name)) {
      throw new Error(`Entity with name ${name} already exists`);
    }

    this.nameMap.setLookupName(entity, name);
    entity.name = name;
  }

  lookupEntity(name: string) {
    return this.nameMap.lookup(name);
  }

  isAlive(entity: Entity) {
    return entity._isAlive;
  }

  destruct(entity: Entity) {
    entity._isAlive = false;
    if (entity.name) {
      this.nameMap.deleteName(entity.name);
    }
    entity.name = undefined;
    entity.componentData.clear();
    entity.archetype = this.storage.destructedArchetype;

    this.entities.delete(entity);

    const archetypesToDelete = new Map<Archetype, Set<Id>>();

    const addArchetypeToDelete = (archetype: Archetype, component: Id) => {
      if (!archetypesToDelete.has(archetype)) {
        archetypesToDelete.set(archetype, new Set());
      }
      archetypesToDelete.get(archetype)!.add(component);
    };

    if (entity.backLinksComponent !== undefined) {
      entity.backLinksComponent.forEach((archetype) => {
        addArchetypeToDelete(archetype, entity);
      });
    }

    if (entity.backLinksType !== undefined) {
      entity.backLinksType.forEach(
        ({ backLinksComponent: archetypes }, target) => {
          archetypes.forEach((archetype) => {
            addArchetypeToDelete(
              archetype,
              ensureRelationshipId(entity, target),
            );
          });
        },
      );
    }

    if (entity.backLinksTarget !== undefined) {
      entity.backLinksTarget.forEach(
        ({ backLinksComponent: archetypes }, relationship) => {
          archetypes.forEach((archetype) => {
            addArchetypeToDelete(
              archetype,
              ensureRelationshipId(relationship, entity),
            );
          });
        },
      );
    }

    for (const [archetype, componentsToRemove] of archetypesToDelete) {
      this.storage.removeComponentsFromArchetypeAndDeleteIt(
        archetype,
        componentsToRemove,
      );
    }
  }

  removeFromAll(entityOrRelationship: Id, target?: Entity) {
    const idToRemove = (() => {
      if (entityOrRelationship instanceof Pair && target === undefined) {
        return entityOrRelationship;
      }
      if (entityOrRelationship instanceof Entity && target === undefined) {
        return entityOrRelationship;
      }
      if (entityOrRelationship instanceof Entity && target !== undefined) {
        return ensureRelationshipId(entityOrRelationship, target);
      } else //(entityOrRelationship instanceof Relationship && target !== undefined)
      {
        throw new Error("Cannot specify target when removing a relationship");
      }
    })();

    this.#checkValid(idToRemove);

    if (idToRemove.backLinksComponent === undefined) return;

    for (const archetype of idToRemove.backLinksComponent) {
      this.storage.removeComponentsFromArchetypeAndDeleteIt(
        archetype,
        new Set([idToRemove]),
      );
    }
  }

  destructAllWith(entityOrRelationship: Id, target?: Entity) {
    const idToRemove = (() => {
      if (entityOrRelationship instanceof Pair && target === undefined) {
        return entityOrRelationship;
      }
      if (entityOrRelationship instanceof Entity && target === undefined) {
        return entityOrRelationship;
      }
      if (entityOrRelationship instanceof Entity && target !== undefined) {
        return ensureRelationshipId(entityOrRelationship, target);
      } else //(entityOrRelationship instanceof Relationship && target !== undefined)
      {
        throw new Error(
          "Cannot destructAllWith with a relationship and another entity",
        );
      }
    })();

    this.#checkValid(idToRemove);

    if (idToRemove.backLinksComponent === undefined) return;

    idToRemove.backLinksComponent
      .keys()
      .flatMap((archetype) => archetype.entities.keys())
      .forEach((entity) => this.destruct(entity));

    idToRemove.backLinksComponent.forEach((archetype) =>
      this.storage.deleteArchetype(archetype),
    );
  }

  clear(entity: Entity) {
    this.storage.moveToEmptyArchetype(entity);
  }

  has(entity: Entity, component: Id) {
    return has(entity, component);
  }

  remove(entity: Entity, id: Id) {
    this.#checkValid(id);

    if (!has(entity, id)) return;

    this.operation.open(entity, { type: LinkType.Remove, id }, (operation) => {
      if (operation.isRemoving(id)) return;

      operation.remove(id);
      operation.delete(id);

      runAllHooks(Phase.postRemove, id, entity);
    });
  }

  add(entity: Entity, id: Id, leaveUninitialized: boolean = false) {
    if (has(entity, id)) return;
    this.#checkValid(id);

    this.operation.open(
      entity,
      {
        type: LinkType.Add,
        id,
      },
      (operation) => {
        if (operation.isAdding(id)) return;

        // pre hooks
        runAllHooks(Phase.preAdd, id, entity);

        // add this
        operation.add(id);
        if (!leaveUninitialized && hasData(id)) {
          if (!canDefaultInitialize(id)) {
            throw new Error(
              `Component "${getName(id)}" cannot be default initialized and thus not be used in add`,
            );
          }

          operation.set(id, id.initializer.defaultInitialize());
        }

        // post hooks
        runAllHooks(Phase.postAdd, id, entity);
      },
    );
  }

  set(entity: Entity, id: Id, newVal: unknown) {
    if (!hasData(id)) {
      throw new Error(`"${getName(id)}" has no data to be set`);
    }

    this.add(entity, id, true);

    entity.componentData.set(id, id.initializer.initialize(newVal));
  }

  get(entity: Entity, id: Id) {
    return entity.componentData.get(id);
  }

  hasAnyRelationship(entity: Entity, relationship: Entity) {
    for (const component of entity.archetype.components) {
      if (component.target !== undefined && component.type === relationship) {
        return true;
      }
    }
    return false;
  }

  getRelationshipTargets(entity: Entity, relationship: Entity): Set<Entity> {
    return getRelationshipTargets(entity, relationship);
  }

  getARelationshipTarget(
    entity: Entity,
    relationship: Entity,
  ): Entity | undefined {
    return getARelationshipTarget(entity, relationship);
  }

  #checkValid(id: Id) {
    if (isPair(id)) {
      if (!this.entities.has(id.type)) {
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

  addHook(
    phase: Phase,
    operation: Operation.asComponent,
    query: Query,
    callback: ComponentHookCallback,
  ): void;
  addHook(
    phase: Phase,
    operation: Operation.asRelationship,
    query: Query,
    callback: RelationshipHookCallback,
  ): void;
  addHook(
    phase: Phase,
    operation: Operation.asTarget,
    query: Query,
    callback: RelationshipHookCallback,
  ): void;
  addHook(
    phase: Phase,
    operation: Operation,
    query: Query,
    callback: ComponentHookCallback | RelationshipHookCallback,
  ) {
    query.forEachArchetype((archetype) => {
      // @ts-expect-error // chained overloads
      archetype.hooks.add(phase, operation, callback);
    });
    this.storage.addNewArchetypeCallbacks.add((archetype) => {
      if (query.matches(archetype)) {
        // @ts-expect-error // chained overloads
        archetype.hooks.add(phase, operation, callback);
      }
    });
  }
}
