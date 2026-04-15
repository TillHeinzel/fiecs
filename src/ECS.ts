import { Backend, Entity, Pair } from "./Backend";
import { builtinTraits } from "./builtinTraits";

export class ECS {
  private backend: Backend = new Backend();

  builtin = (() => {
    const traits = builtinTraits(this.backend);

    return {
      Trait: new EntityHandle(traits.Trait, this.backend),
      Relationship: new EntityHandle(traits.Relationship, this.backend),
      RelationshipHasNoData: new EntityHandle(
        traits.RelationshipHasNoData,
        this.backend,
      ),
      With: new EntityHandle(traits.With, this.backend),
      Acyclic: new EntityHandle(traits.Acyclic, this.backend),
      Singleton: new EntityHandle(traits.Singleton, this.backend),
      Symmetric: new EntityHandle(traits.Symmetric, this.backend),
      Target: new EntityHandle(traits.Target, this.backend),
      TargetMustBeDefaultInitializable: new EntityHandle(
        traits.TargetMustBeDefaultInitializable,
        this.backend,
      ),
      Exclusive: new EntityHandle(traits.Exclusive, this.backend),
    };
  })();

  startStatistics() {
    this.backend.storage.startStatistics();
  }

  stopStatistics() {
    this.backend.storage.stopStatistics();
  }

  getStatistics() {
    return this.backend.storage.getStatistics();
  }

  getArchetypeCount() {
    return this.backend.storage.getArchetypeCount();
  }

  getArchetypeGraphEdgeCount() {
    return this.backend.storage.getLinkCount();
  }

  entity(name?: string) {
    return new EntityHandle(this.backend.entity(name), this.backend);
  }

  tag(name?: string) {
    return new EntityHandle(this.backend.tag(name), this.backend);
  }

  component<T extends ComponentDataSchema>(schema: T) {
    return new ComponentHandle<T>(this.backend.component(schema), this.backend);
  }

  pair<T extends ComponentDataSchema>(
    relationship: ComponentHandle<T>,
    target: EntityHandle,
  ): RelationshipComponentHandle<T>;
  pair(relationship: EntityHandle, target: EntityHandle): RelationshipTagHandle;
  pair(
    relationship: EntityHandle | ComponentHandle<ComponentDataSchema>,
    target: EntityHandle,
  ) {
    this.backend.checkValid(relationship.data);

    if (relationship instanceof ComponentHandle) {
      return new RelationshipComponentHandle(
        this.backend.pair(relationship.data, target.data),
        this.backend,
      );
    }
    if (relationship instanceof EntityHandle) {
      return new RelationshipTagHandle(
        this.backend.pair(relationship.data, target.data),
        this.backend,
      );
    }
  }

  lookupEntity(name: string) {
    const entityData = this.backend.lookupEntity(name);
    return entityData ? new EntityHandle(entityData, this.backend) : undefined;
  }

  removeFromAll(component: AnyComponentHandle): void;
  removeFromAll(
    component: AnyComponentHandle,
    target: AnyComponentHandle,
  ): void;
  removeFromAll(component: AnyRelationshipHandle): void;
  removeFromAll(first: AnyIdHandle, second?: AnyComponentHandle) {
    if (second === undefined) {
      this.backend.removeFromAll(first.data);
      return;
    }
    if (first instanceof ComponentHandle || first instanceof EntityHandle) {
      this.backend.removeFromAll(this.backend.pair(first.data, second.data));
      return;
    }

    throw new Error("Invalid arguments for removeFromAll");
  }

  destructAllWith(component: AnyComponentHandle): void;
  destructAllWith(
    component: AnyComponentHandle,
    target: AnyComponentHandle,
  ): void;
  destructAllWith(component: AnyRelationshipHandle): void;
  destructAllWith(first: AnyIdHandle, second?: AnyComponentHandle) {
    if (second === undefined) {
      this.backend.destructAllWith(first.data);
      return;
    }
    if (first instanceof ComponentHandle || first instanceof EntityHandle) {
      this.backend.destructAllWith(this.backend.pair(first.data, second.data));
      return;
    }

    throw new Error("Invalid arguments for destructAllWith");
  }

  set<T extends ComponentDataSchema>(
    component: ComponentHandle<T>,
    newVal: InferType<T>,
  ): void {
    this.backend.add(component.data, this.builtin.Singleton.data);
    this.backend.set(component.data, component.data, newVal);
  }

  _debugBackendOperationIsDirty() {
    // @ts-expect-error // exposing for testing purposes, not part of public API
    return this.backend.operation.isDirty();
  }
}

export class EntityHandle {
  data: Entity;
  private backend: Backend;

  constructor(data: Entity, backend: Backend) {
    this.data = data;
    this.backend = backend;
  }

  getName() {
    return this.backend.getName(this.data);
  }

  setName(name: string) {
    this.backend.setName(this.data, name);
  }

  isSameEntityAs(other: EntityHandle) {
    return this.data === other.data;
  }

  isAlive() {
    return this.backend.isAlive(this.data);
  }

  destruct() {
    this.backend.destruct(this.data);
  }

  clear() {
    this.backend.clear(this.data);
  }

  has(component: AnyIdHandle): boolean;
  has(relationship: AnyComponentHandle, target: EntityHandle): boolean;
  has(componentOrRelationship: AnyIdHandle, target?: EntityHandle): boolean {
    if (target === undefined) {
      return this.backend.has(this.data, componentOrRelationship.data);
    }
    if (
      componentOrRelationship instanceof ComponentHandle ||
      componentOrRelationship instanceof EntityHandle
    ) {
      return this.backend.has(
        this.data,
        this.backend.pair(componentOrRelationship.data, target.data),
      );
    }

    throw new Error("Invalid arguments for has");
  }

  remove(id: AnyIdHandle): void;
  remove(relationship: AnyComponentHandle, target: EntityHandle): void;
  remove(component: AnyIdHandle, target?: EntityHandle) {
    if (target === undefined) {
      this.backend.remove(this.data, component.data);
      return;
    }
    if (
      component instanceof ComponentHandle ||
      component instanceof EntityHandle
    ) {
      this.backend.remove(
        this.data,
        this.backend.pair(component.data, target.data),
      );
      return;
    }

    throw new Error("Invalid arguments for remove");
  }

  add(component: AnyComponentHandle): void;
  add(fullRelationship: AnyRelationshipHandle): void;
  add(relationship: AnyComponentHandle, target: EntityHandle): void;
  add(first: AnyIdHandle, second?: EntityHandle) {
    if (first instanceof EntityHandle && second === undefined) {
      this.backend.add(this.data, first.data);
      return;
    }
    if (first instanceof EntityHandle && second !== undefined) {
      this.backend.add(this.data, this.backend.pair(first.data, second.data));
      return;
    }
    if (
      (first instanceof RelationshipTagHandle ||
        first instanceof RelationshipComponentHandle) &&
      second === undefined
    ) {
      this.backend.add(this.data, first.data);
      return;
    }
    throw new Error("Bad arguments for add");
  }

  set<T extends ComponentDataSchema>(
    component: ComponentHandle<T>,
    newVal: InferType<T>,
  ): void;
  set<T extends ComponentDataSchema>(
    explicitRelationship: RelationshipComponentHandle<T>,
    newVal: InferType<T>,
  ): void;
  set<T extends ComponentDataSchema>(
    component: ComponentHandle<T>,
    target: EntityHandle,
    newVal: InferType<T>,
  ): void;
  set<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(
    component: ComponentHandle<T1>,
    target: ComponentHandle<T2>,
    newVal: InferType<T1>,
  ): void;
  set<T extends ComponentDataSchema>(
    component: EntityHandle,
    target: ComponentHandle<T>,
    newVal: InferType<T>,
  ): void;
  set<T extends ComponentDataSchema>(
    first: EntityHandle | ComponentHandle<T> | RelationshipComponentHandle<T>,
    second: AnyComponentHandle | InferType<T>,
    third?: InferType<T>,
  ) {
    if (
      first instanceof ComponentHandle &&
      !(second instanceof EntityHandle) &&
      third === undefined
    ) {
      this.backend.set(this.data, first.data, second);
      return;
    }
    if (first instanceof RelationshipComponentHandle && third === undefined) {
      this.backend.set(this.data, first.data, second);
      return;
    }
    if (
      (first instanceof EntityHandle || first instanceof ComponentHandle) &&
      (second instanceof EntityHandle || second instanceof ComponentHandle)
    ) {
      this.backend.set(
        this.data,
        this.backend.pair(first.data, second.data),
        third,
      );
      return;
    }

    throw new Error("Invalid arguments for setData");
  }

  get<T extends ComponentDataSchema>(
    component: ComponentHandle<T>,
  ): InferType<T> | undefined;
  get<T extends ComponentDataSchema>(
    component: RelationshipComponentHandle<T>,
  ): InferType<T> | undefined;
  get<T extends ComponentDataSchema>(
    component: ComponentHandle<T>,
    target: EntityHandle,
  ): InferType<T> | undefined;
  get<T extends ComponentDataSchema>(
    component: EntityHandle,
    target: ComponentHandle<T>,
  ): InferType<T> | undefined;
  get<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(
    component: ComponentHandle<T1>,
    target: ComponentHandle<T2>,
  ): InferType<T1> | undefined;
  get(
    first:
      | AnyComponentHandle
      | RelationshipComponentHandle<ComponentDataSchema>,
    second?: AnyComponentHandle,
  ) {
    if (first instanceof ComponentHandle && second === undefined) {
      return this.backend.get(this.data, first.data);
    }
    if (first instanceof RelationshipComponentHandle && second === undefined) {
      return this.backend.get(this.data, first.data);
    }
    if (first instanceof ComponentHandle && second instanceof EntityHandle) {
      return this.backend.get(
        this.data,
        this.backend.pair(first.data, second.data),
      );
    }
    if (first instanceof EntityHandle && second instanceof ComponentHandle) {
      return this.backend.get(
        this.data,
        this.backend.pair(first.data, second.data),
      );
    }
    if (first instanceof ComponentHandle && second instanceof ComponentHandle) {
      return this.backend.get(
        this.data,
        this.backend.pair(first.data, second.data),
      );
    }

    throw new Error("Invalid arguments for getData");
  }

  hasAnyRelationship(relationship: AnyComponentHandle) {
    return this.backend.hasAnyRelationship(this.data, relationship.data);
  }

  getRelationshipTargets(relationship: AnyComponentHandle): Set<EntityHandle> {
    return new Set(
      this.backend
        .getRelationshipTargets(this.data, relationship.data)
        .entries()
        .map(([target]) => new EntityHandle(target, this.backend)),
    );
  }

  getARelationshipTarget(
    relationship: AnyComponentHandle,
  ): EntityHandle | undefined {
    const target = this.backend.getARelationshipTarget(
      this.data,
      relationship.data,
    );

    return target ? new EntityHandle(target, this.backend) : undefined;
  }
}

export class ComponentHandle<
  // needed for type inference when using the handle, even if not used directly here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends ComponentDataSchema,
> extends EntityHandle {
  constructor(
    public _data: Entity,
    backend: Backend,
  ) {
    super(_data, backend);
  }
}

export class RelationshipTagHandle {
  data: Pair;
  // eslint-disable-next-line no-unused-private-class-members
  #backend: Backend;

  constructor(_data: Pair, backend: Backend) {
    this.data = _data;
    this.#backend = backend;
  }
}

// needed for type inference when using the handle, even if not used directly here
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class RelationshipComponentHandle<T extends ComponentDataSchema> {
  data: Pair;
  // eslint-disable-next-line no-unused-private-class-members
  #backend: Backend;

  constructor(_data: Pair, backend: Backend) {
    this.data = _data;
    this.#backend = backend;
  }
}

type AnyComponentHandle = EntityHandle | ComponentHandle<ComponentDataSchema>;

type AnyRelationshipHandle =
  | RelationshipTagHandle
  | RelationshipComponentHandle<ComponentDataSchema>;

type AnyIdHandle = AnyComponentHandle | AnyRelationshipHandle;

type ComponentDataSchema = {
  parse(val: unknown): unknown;
};

type InferType<T extends ComponentDataSchema> = ReturnType<T["parse"]>;
