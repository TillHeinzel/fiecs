import { Archetype, LinkType, Operation, Phase } from "./Archetype";
import {
  canDefaultInitialize,
  Entity,
  getARelationshipPair,
  getARelationshipTarget,
  getRelationshipTargets,
  hasData,
  Id,
  Initializer,
  isInUseAsComponent,
  isPair,
  Pair,
} from "./EntityData";
import { down, traverseRelationship } from "./RelationshipTraversal";
import { ECSStorage } from "./Storage";

export class Backend {
  storage: ECSStorage = new ECSStorage();
  nameMap = new NameMap();
  entities: Set<Entity> = new Set();

  builtin = (() => {
    const addTag = (entity: Entity, tag: Entity) => {
      this.storage.moveToArchetype(
        entity,
        { type: LinkType.Add, id: tag },
        new Set([tag]),
        new Set(),
      );
    };

    const Trait = this.createTag("Trait");
    addTag(Trait, Trait);
    this.#createHook(
      Phase.preAdd,
      new Query(Trait),
      Operation.asRelationship,
      (entity, pair) => {
        if (isInUseAsComponent(entity)) {
          throw new Error(
            `Component "${pair.type.getName()}" is a Trait and cannot be added to a component that is already in use!`,
          );
        }
      },
    );

    const Relationship = this.createTag("Relationship");
    addTag(Relationship, Trait);
    this.#createHook(
      Phase.preAdd,
      new Query(Relationship),
      Operation.asComponent,
      (entity, component) => {
        throw new Error(
          `Component "${component.name}" is purely a relationship and cannot be used as a component`,
        );
      },
    );
    this.#createHook(
      Phase.preAdd,
      new Query(Relationship),
      Operation.asTarget,
      (entity, pair) => {
        if (!pair.type.has(this.builtin.Trait)) {
          throw new Error(
            `Component "${pair.target.name}" is purely a relationship and cannot be used as a target of a relationship`,
          );
        }
      },
    );

    const Acyclic = this.createTag("Acyclic");
    addTag(Acyclic, Trait);
    this.#createHook(
      Phase.preAdd,
      new Query(Acyclic),
      Operation.asRelationship,
      (entity, pair) => {
        const relationship = pair.type;
        const target = pair.target;

        if (!relationship.has(this.builtin.Acyclic)) return;

        if (target === entity) {
          throw new Error(
            `Relationship "${relationship.name}" is acyclic and cannot target the entity it is added to`,
          );
        }

        traverseRelationship(relationship, target, down).visit(
          (currentTarget) => {
            if (currentTarget === entity) {
              throw new Error(
                `Relationship "${relationship.name}" is acyclic and cannot be added to an entity that would create a cycle`,
              );
            }
          },
        );
      },
    );

    const RelationshipHasNoData = this.createTag("RelationshipHasNoData");
    addTag(RelationshipHasNoData, Trait);

    const TargetMustBeDefaultInitializable = this.createTag(
      "TargetMustBeDefaultInitializable",
    );
    addTag(TargetMustBeDefaultInitializable, Trait);
    this.#createHook(
      Phase.preAdd,
      new Query(TargetMustBeDefaultInitializable),
      Operation.asRelationship,
      (entity, pair) => {
        const relationship = pair.type;
        const target = pair.target;

        if (!canDefaultInitialize(target)) {
          throw new Error(
            `Relationship "${relationship.name}" is marked as TargetMustBeDefaultInitializable while target "${target.name}" has data and is not default initializable`,
          );
        }
      },
    );

    const With = this.createTag("With");
    addTag(With, Trait);
    addTag(With, Relationship);
    addTag(With, RelationshipHasNoData);
    addTag(With, Acyclic);
    addTag(With, TargetMustBeDefaultInitializable);

    const Singleton = this.createTag("Singleton");
    addTag(Singleton, Trait);
    this.#createHook(
      Phase.preAdd,
      new Query(Singleton),
      Operation.asComponent,
      (entity, component) => {
        if (entity !== component) {
          throw new Error(
            `Component "${component.name}" is a singleton and cannot be added to entities other than itself`,
          );
        }
      },
    );

    const Symmetric = this.createTag("Symmetric");
    addTag(Symmetric, Trait);
    this.#createHook(
      Phase.postAdd,
      new Query(Symmetric),
      Operation.asRelationship,
      (entity, pair) => {
        this.add(pair.target, this.relationship(pair.type, entity));
      },
    );
    this.#createHook(
      Phase.postRemove,
      new Query(Symmetric),
      Operation.asRelationship,
      (entity, pair) => {
        this.remove(pair.target, this.relationship(pair.type, entity));
      },
    );

    const Target = this.createTag("Target");
    addTag(Target, Trait);
    this.#createHook(
      Phase.preAdd,
      new Query(Target),
      Operation.asComponent,
      (entity, component) => {
        throw new Error(
          `Entity "${component.name}" is marked as a Target and cannot be used as a component`,
        );
      },
    );
    this.#createHook(
      Phase.preAdd,
      new Query(Target),
      Operation.asRelationship,
      (entity, pair) => {
        throw new Error(
          `Entity "${pair.type.name}" is marked as a Target and cannot be used as a relationship`,
        );
      },
    );

    const Exclusive = this.createTag("Exclusive");
    addTag(Exclusive, Trait);

    return {
      Trait,
      Relationship,
      Acyclic,
      RelationshipHasNoData,
      With,
      Singleton,
      Symmetric,
      Target,
      TargetMustBeDefaultInitializable,
      Exclusive,
    };
  })();

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
    return entity.getName();
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
    return entity.isAlive;
  }

  destruct(entity: Entity) {
    entity.isAlive = false;
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
    return entity.has(component);
  }

  remove(entity: Entity, id: Id) {
    this.#checkValid(id);

    if (!entity.has(id)) return;

    this.operation.open(entity, { type: LinkType.Remove, id }, (operation) => {
      if (operation.isRemoving(id)) return;

      operation.remove(id);
      operation.delete(id);

      this.#withedTargets(id).forEach((withedTarget) => {
        this.remove(entity, withedTarget);
      });

      runHooks(Phase.postRemove, id, entity);
    });
  }

  operation = new OperationManager(this.storage);

  add(entity: Entity, id: Id, leaveUninitialized: boolean = false) {
    if (entity.has(id)) return;
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
        runHooks(Phase.preAdd, id, entity);

        if (isPair(id) && id.type.has(this.builtin.Exclusive)) {
          const currentPair = getARelationshipPair(entity, id.type);

          if (currentPair !== undefined) {
            this.remove(entity, currentPair);

            getRelationshipTargets(id.type, this.builtin.With)
              .keys()
              .forEach((withComp) =>
                this.remove(
                  entity,
                  ensureRelationshipId(withComp, currentPair.target),
                ),
              );
          }
        }

        // add this
        operation.add(id);
        if (
          !leaveUninitialized &&
          hasData(id) &&
          !(isPair(id) && id.type.has(this.builtin.RelationshipHasNoData))
        ) {
          if (!canDefaultInitialize(id)) {
            throw new Error(
              `Component "${id.getName()}" cannot be default initialized and thus not be used in add`,
            );
          }

          operation.set(id, id.initializer.defaultInitialize());
        }

        // With trait
        if (isPair(id)) {
          getRelationshipTargets(id.type, this.builtin.With)
            .keys()
            .forEach((withComp) =>
              this.add(entity, ensureRelationshipId(withComp, id.target)),
            );
        } else {
          getRelationshipTargets(id.type, this.builtin.With)
            .keys()
            .forEach((withId) => this.add(entity, withId));
        }

        // post hooks
        runHooks(Phase.postAdd, id, entity);
      },
    );
  }

  set(entity: Entity, id: Id, newVal: unknown) {
    if (isPair(id) && id.type.has(this.builtin.RelationshipHasNoData)) {
      throw new Error(`Relationship "${id.type.name}" cannot have data`);
    }

    this.add(entity, id, true);

    entity.componentData.set(id, id.initializer!.initialize(newVal));
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

  #createHook(
    phase: Phase,
    query: Query,
    operation: Operation.asComponent,
    callback: (entity: Entity, component: Entity) => void,
  ): void;
  #createHook(
    phase: Phase,
    query: Query,
    operation: Operation.asRelationship,
    callback: (entity: Entity, pair: Pair) => void,
  ): void;

  #createHook(
    phase: Phase,
    query: Query,
    operation: Operation.asTarget,
    callback: (entity: Entity, pair: Pair) => void,
  ): void;
  #createHook(
    phase: Phase,
    query: Query,
    operation: Operation,
    callback:
      | ((entity: Entity, component: Entity) => void)
      | ((entity: Entity, pair: Pair) => void),
  ) {
    query.forEachArchetype((archetype) => {
      // @ts-expect-error // chained overloads
      archetype.setHook(phase, operation, callback);
    });
    this.storage.addNewArchetypeCallbacks.add((archetype) => {
      if (query.matches(archetype)) {
        // @ts-expect-error // chained overloads
        archetype.setHook(phase, operation, callback);
      }
    });
  }

  #withedTargets(id: Id): Set<Id> {
    if (id instanceof Pair) {
      return new Set<Id>(
        this.builtin.With.backLinksType
          ?.get(id.type)
          ?.backLinksComponent?.keys()
          .flatMap((archetype) => archetype.entities)
          ?.map((withComp) => ensureRelationshipId(withComp, id.target)),
      );
    } else {
      return new Set<Id>(
        this.builtin.With.backLinksType
          ?.get(id.type)
          ?.backLinksComponent?.keys()
          .flatMap((archetype) => archetype.entities),
      );
    }
  }
}

function ensureRelationshipId(type: Entity, target: Entity) {
  return lookupRelationshipId() ?? createRelationshipId();

  function lookupRelationshipId() {
    return type.backLinksType?.get(target);
  }

  function createRelationshipId() {
    const newId = new Pair(type, target);
    if (type.backLinksType === undefined) type.backLinksType = new Map();
    type.backLinksType.set(target, newId);
    if (target.backLinksTarget === undefined)
      target.backLinksTarget = new Map();
    target.backLinksTarget.set(type, newId);
    return newId;
  }
}

class NameMap {
  #nameMap: Map<string, Entity> = new Map();

  hasLookupName(name: string) {
    return this.#nameMap.has(name);
  }

  setLookupName(entityData: Entity, name: string) {
    if (entityData.name) {
      this.#nameMap.delete(entityData.name);
    }
    this.#nameMap.set(name, entityData);
  }

  deleteName(name: string) {
    this.#nameMap.delete(name);
  }

  lookup(name: string) {
    return this.#nameMap.get(name);
  }
}

class Query {
  component: Entity;

  constructor(component: Entity) {
    this.component = component;
  }

  forEachArchetype(callback: (archetype: Archetype) => void): void {
    for (const archetype of this.component.backLinksComponent ?? []) {
      callback(archetype);
    }
  }

  matches(archetype: Archetype): boolean {
    return archetype.components.has(this.component);
  }
}

const runHooks = (phase: Phase, id: Id, entity: Entity) => {
  if (isPair(id)) {
    const pair = id;

    pair.type.archetype
      .getHooks(phase, Operation.asRelationship)
      .forEach((hook) => hook(entity, pair));

    pair.target.archetype
      .getHooks(phase, Operation.asTarget)
      .forEach((hook) => hook(entity, pair));
  } else {
    const component = id;

    component.archetype
      .getHooks(phase, Operation.asComponent)
      .forEach((hook) => hook(entity, component));
  }
};
class OperationPayload {
  entity: Entity;
  link: { type: LinkType; id: Id };
  dataToSet: [Id, unknown][] = [];
  dataToRemove: Set<Id> = new Set();
  idsToAdd: Set<Id> = new Set();
  idsToRemove: Set<Id> = new Set();
  postHooksToCall: (() => void)[] = [];

  constructor(entity: Entity, link: { type: LinkType; id: Id }) {
    this.entity = entity;
    this.link = link;
  }

  add(id: Id) {
    this.idsToAdd.add(id);
  }

  remove(id: Id) {
    this.idsToRemove.add(id);
  }

  set(id: Id, val: unknown) {
    this.dataToSet.push([id, val]);
  }

  delete(id: Id) {
    this.dataToRemove.add(id);
  }

  isAdding(id: Id) {
    return this.idsToAdd.has(id);
  }

  isRemoving(id: Id) {
    return this.idsToRemove.has(id);
  }

  close(storage: ECSStorage) {
    this.dataToSet.forEach(([id, val]) => {
      this.entity.componentData.set(id, val);
    });
    this.dataToRemove.forEach((id) => {
      this.entity.componentData.delete(id);
    });

    storage.moveToArchetype(
      this.entity,
      this.link,
      this.idsToAdd,
      this.idsToRemove,
    );

    this.postHooksToCall.forEach((callback) => callback());
  }
}

class OperationManager {
  storage: ECSStorage;
  #opens = 0;
  #dirty = false;
  #targets: Map<Entity, OperationPayload> = new Map();

  constructor(storage: ECSStorage) {
    this.storage = storage;
  }

  isDirty() {
    return this.#opens > 0 || this.#dirty;
  }

  open(
    entity: Entity,
    link: { type: LinkType; id: Id },
    callback: (operationPayload: OperationPayload) => void,
  ) {
    this.#opens++;
    const target = (() => {
      const existingTarget = this.#targets.get(entity);
      if (existingTarget !== undefined) return existingTarget;

      return new OperationPayload(entity, link);
    })();

    this.#targets.set(entity, target);
    try {
      callback(target);
    } catch (e) {
      this.#dirty = true;
      throw e;
    } finally {
      this.#opens--;
      if (this.#opens === 0) {
        if (!this.#dirty) {
          this.#targets.forEach((payload) => payload.close(this.storage));
        }

        this.#targets.clear();
        this.#dirty = false;
      }
    }
  }
}
