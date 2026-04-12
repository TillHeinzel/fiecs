import { Archetype } from "./Core/Archetype";
import { Entity, Id, Pair } from "./Core/EntityData";
import { LinkType } from "./Core/Links";
import { ECSStorage } from "./Core/Storage";

export class AtomicOperationManager {
  storage: ECSStorage<Archetype, Entity, Pair>;
  #opens = 0;
  #dirty = false;
  #targets: Map<Entity, OperationPayload> = new Map();

  constructor(storage: ECSStorage<Archetype, Entity, Pair>) {
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
class OperationPayload {
  entity: Entity;
  link: { type: LinkType; id: Id };
  dataToSet: [Id, unknown][] = [];
  dataToRemove: Set<Id> = new Set();
  idsToAdd: Set<Id> = new Set();
  idsToRemove: Set<Id> = new Set();

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

  close(storage: ECSStorage<Archetype, Entity, Pair>) {
    storage.moveToArchetype(
      this.entity,
      this.link,
      this.idsToAdd,
      this.idsToRemove,
    );
    this.dataToSet.forEach(([id, val]) => {
      storage.set(this.entity, id, val);
    });
  }
}
