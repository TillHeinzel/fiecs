import { Entity, Id } from "./EntityData";
import { LinkType } from "./Hooks";
import { ECSStorage } from "./Storage";

export class AtomicOperationManager {
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
