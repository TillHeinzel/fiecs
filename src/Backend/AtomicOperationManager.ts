import { ArchetypeGraph, LinkType } from "./ArchetypeGraph";
import { Archetype, Entity, Pair } from "./BasicObjects";

export class AtomicOperationManager {
  storage: ArchetypeGraph<Archetype, Entity, Pair>;
  #opens = 0;
  #dirty = false;
  #targets: Map<Entity, OperationPayload> = new Map();

  constructor(storage: ArchetypeGraph<Archetype, Entity, Pair>) {
    this.storage = storage;
  }

  isDirty() {
    return this.#opens > 0 || this.#dirty;
  }

  open(
    entity: Entity,
    link: { type: LinkType; id: Entity | Pair },
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
  link: { type: LinkType; id: Entity | Pair };
  dataToSet: [Entity | Pair, unknown][] = [];
  dataToRemove: Set<Entity | Pair> = new Set();
  idsToAdd: Set<Entity | Pair> = new Set();
  idsToRemove: Set<Entity | Pair> = new Set();

  constructor(entity: Entity, link: { type: LinkType; id: Entity | Pair }) {
    this.entity = entity;
    this.link = link;
  }

  add(id: Entity | Pair) {
    this.idsToAdd.add(id);
  }

  remove(id: Entity | Pair) {
    this.idsToRemove.add(id);
  }

  set(id: Entity | Pair, val: unknown) {
    this.dataToSet.push([id, val]);
  }

  delete(id: Entity | Pair) {
    this.dataToRemove.add(id);
  }

  isAdding(id: Entity | Pair) {
    return this.idsToAdd.has(id);
  }

  isRemoving(id: Entity | Pair) {
    return this.idsToRemove.has(id);
  }

  close(storage: ArchetypeGraph<Archetype, Entity, Pair>) {
    storage.moveToArchetype(
      this.entity,
      this.link,
      this.idsToAdd,
      this.idsToRemove,
    );
    this.dataToSet.forEach(([id, val]) => {
      this.entity.set(id, val);
    });
  }
}
