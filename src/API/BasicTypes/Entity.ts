import * as Backend from "#/Backend";

import {
  mapEntityFromBackend,
  mapIdFromBackend,
  mapIdTobackend,
  mapIdToBackendWithString,
  mapIndexToBackendWithString,
} from "../mapWithBackend";
import {
  AnyId,
  AnyIdObject,
  AnyIdWithData,
  AnyIndex,
  AnyPairIdObject,
  AnyPairIndex,
  AnySingleId,
  AnySingleIndex,
} from "./";

class EntityHandleBase {
  data: Backend.Entity;
  protected backend: Backend.Backend;

  constructor(data: Backend.Entity, backend: Backend.Backend) {
    this.backend = backend;
    this.data = data;
  }

  getName() {
    return this.backend.getName(this.data);
  }

  setName(name: string) {
    this.backend.setName(this.data, name);
    return this;
  }

  isAlive() {
    return this.backend.isAlive(this.data);
  }

  destruct() {
    this.backend.destruct(this.data);
  }

  clear() {
    this.backend.clear(this.data);
    return this;
  }

  type(): AnyIdObject[] {
    const archetype = this.data.archetype;

    if (archetype === undefined) return [];

    return [...archetype.components].map((component) =>
      mapIdFromBackend(component, this.backend),
    );
  }

  has(term: AnyIndex | string): boolean {
    const mapped = mapIndexToBackendWithString(term, this.backend);

    return mapped ? this.backend.has(this.data, mapped) : false;
  }

  remove(id: AnyIndex | string) {
    const mapped = mapIndexToBackendWithString(id, this.backend);

    if (mapped) this.backend.remove(this.data, mapped);
    return this;
  }

  add(id: AnyId | string): this {
    const mapped = mapIdToBackendWithString(id, this.backend);

    if (!mapped) {
      throw new Error(
        `Could not find component with name "${JSON.stringify(id)}"`,
      );
    }

    this.backend.add(this.data, mapped);
    return this;
  }

  set<T>(id: AnyIdWithData<T>, newVal: T): this {
    this.backend.set(this.data, mapIdTobackend(id, this.backend), newVal);
    return this;
  }

  get<T>(id: AnyIdWithData<T>): T | undefined {
    return this.backend.get(this.data, mapIdTobackend(id, this.backend)) as T;
  }

  components(): IteratorObject<AnyIdObject>;
  components(term: AnySingleIndex | string): IteratorObject<AnySingleId>;
  components(term: AnyPairIndex): IteratorObject<AnyPairIdObject>;
  components(
    term?: AnyIndex | string,
  ):
    | IteratorObject<Tag | Component<unknown> | AnyPairIdObject>
    | IteratorObject<Tag | Component<unknown>>
    | IteratorObject<AnyPairIdObject> {
    if (term === undefined) {
      return this.backend
        .getComponents(this.data)
        .map((component) => mapIdFromBackend(component, this.backend));
    }

    const mapped = mapIndexToBackendWithString(term, this.backend);

    if (!mapped) return [].values();

    return this.backend
      .getComponents(this.data, mapped)
      .map((component) => mapIdFromBackend(component, this.backend));
  }

  findComponent(term?: AnyIndex | string): AnyIdObject | undefined {
    const fromBackend = (() => {
      if (term === undefined) return this.backend.findComponent(this.data);

      const mapped = mapIndexToBackendWithString(term, this.backend);

      if (!mapped) return undefined;

      return this.backend.findComponent(this.data, mapped);
    })();
    if (fromBackend === undefined) {
      return undefined;
    }

    return mapIdFromBackend(fromBackend, this.backend);
  }

  childOf(parent: Entity | string | undefined) {
    if (parent === undefined) {
      const existingParentData = this.backend.getParent(this.data);
      if (existingParentData !== undefined) {
        this.backend.remove(
          this.data,
          this.backend.pair(this.backend.builtin.ChildOf, existingParentData),
        );
      }
    } else {
      const actualParent = (() => {
        if (typeof parent === "string") {
          const lookup = this.backend.lookupEntity(parent);
          if (lookup === undefined) {
            throw new Error(`Requested parent ${parent} does not exist`);
          }

          return lookup;
        }

        return parent.data;
      })();

      this.backend.add(
        this.data,
        this.backend.pair(this.backend.builtin.ChildOf, actualParent),
      );
    }
    return this;
  }

  getParent() {
    return mapEntityFromBackend(
      this.backend.getParent(this.data),
      this.backend,
    );
  }

  getChildren() {
    return this.backend
      .getChildren(this.data)
      .map((entity) => new Entity(entity, this.backend));
  }

  getPath() {
    return this.backend.getPath(this.data);
  }

  isSameAs(other: AnyIdObject) {
    if (other instanceof EntityHandleBase) return this.data === other.data;
    return false;
  }

  hasData() {
    return this.data.hasData();
  }

  asComponent<T>(): Component<T> | undefined {
    if (this.data.hasData()) return new Component<T>(this.data, this.backend);
    return undefined;
  }
}

export class Entity extends EntityHandleBase {
  _entityBrand: undefined = undefined;
}

export type Tag = Entity;

export class Component<T> extends EntityHandleBase {
  _componentBrand: undefined = undefined;

  getInitializer() {
    return this.backend.initializer(this.data) as T;
  }
}
export function isComponent(x: unknown): x is Component<unknown> {
  return x instanceof Component;
}

export function isEntity(x: unknown): x is Entity {
  return x instanceof Entity;
}
