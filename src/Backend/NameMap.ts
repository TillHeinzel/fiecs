import { Entity } from "./BasicObjects";

export class NameMap {
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

  lookup(name?: string) {
    if (name === undefined) return undefined;
    return this.#nameMap.get(name);
  }
}
