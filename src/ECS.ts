import * as Backend from "./Backend";
import { builtinTraits } from "./builtinTraits";
import { ObjectGCTracker } from "./Utility/GCtesting";

class BackendHandleBase {
  protected backend: Backend.Backend;

  constructor(backend: Backend.Backend) {
    this.backend = backend;
  }

  protected mapFromBackend(
    component: Backend.Entity | Backend.Pair,
  ): Tag | PairTag {
    if (component instanceof Backend.Entity) {
      return new Entity(component as unknown as Backend.Entity, this.backend);
    }
    return new PairTag(component as unknown as Backend.Pair, this.backend);
  }

  protected mapToBackend([first, second]: [undefined, undefined]): undefined;
  protected mapToBackend([first, second]: [
    AnyId | Wildcard,
    AnyComponent | Wildcard | undefined,
  ]):
    | Backend.Entity
    | Backend.Pair
    | Backend.Wildcard
    | [Backend.Entity, Backend.Entity]
    | [Backend.Entity, Backend.Wildcard]
    | [Backend.Wildcard, Backend.Entity]
    | [Backend.Wildcard, Backend.Wildcard];
  protected mapToBackend([first, second]: [
    AnyId | Wildcard | undefined,
    AnyComponent | Wildcard | undefined,
  ]) {
    if (first === undefined) {
      return undefined;
    }
    if (second === undefined) {
      return this.mapOne(first);
    }
    if (isPair(first)) {
      throw new Error("Cannot create a pair with a pair as the relationship");
    }
    return [this.mapOne(first), this.mapOne(second)] as
      | [Backend.Entity, Backend.Entity]
      | [Backend.Entity, Backend.Wildcard]
      | [Backend.Wildcard, Backend.Entity]
      | [Backend.Wildcard, Backend.Wildcard];
  }

  private mapOne(first: AnyComponent): Backend.Entity;
  private mapOne(first: AnyPair): Backend.Pair;
  private mapOne(first: Wildcard | "*"): Backend.Wildcard;
  private mapOne(
    first: AnyId | Wildcard | "*",
  ): Backend.Entity | Backend.Pair | Backend.Wildcard;
  private mapOne(first: AnyComponent | AnyPair | Wildcard | "*") {
    if (first === "*") {
      return this.backend.wildcard;
    }
    return first.data;
  }
}

export class World extends BackendHandleBase {
  constructor() {
    super(new Backend.Backend());
  }

  builtin = (() => {
    const traits = builtinTraits(this.backend);

    return {
      Trait: new Entity(traits.Trait, this.backend),
      Relationship: new Entity(traits.Relationship, this.backend),
      RelationshipHasNoData: new Entity(
        traits.RelationshipHasNoData,
        this.backend,
      ),
      With: new Entity(traits.With, this.backend),
      Acyclic: new Entity(traits.Acyclic, this.backend),
      Singleton: new Entity(traits.Singleton, this.backend),
      Symmetric: new Entity(traits.Symmetric, this.backend),
      Target: new Entity(traits.Target, this.backend),
      TargetMustBeDefaultInitializable: new Entity(
        traits.TargetMustBeDefaultInitializable,
        this.backend,
      ),
      Exclusive: new Entity(traits.Exclusive, this.backend),
    };
  })();

  wildcard: Wildcard = { data: this.backend.wildcard };

  private logger?: Logger;

  startStatistics() {
    this.logger = new Logger();
    this.backend.startStatistics(this.logger);
  }

  stopStatistics() {
    this.backend.stopStatistics();
    this.logger = undefined;
  }

  getStatistics() {
    if (!this.logger) {
      throw new Error("Statistics not started");
    }
    return {
      expensiveLookups: this.logger.expensiveLookups,
      archetypesAdded: this.logger.archetypesAdded,
      archetypesDeleted: this.logger.archetypesDeleted,
      linksAdded: this.logger.linksAdded,
      linksDeleted: this.logger.linksDeleted,
      liveArchetypes: this.logger.liveArchetypes(),
      liveLinks: this.logger.liveLinks(),
    };
  }

  entity(name?: string) {
    return new Entity(this.backend.entity(name), this.backend);
  }

  tag(name?: string) {
    return new Entity(this.backend.tag(name), this.backend);
  }

  component<T extends ComponentDataSchema>(schema: T) {
    return new Component<T>(this.backend.component(schema), this.backend);
  }

  pair<T extends ComponentDataSchema>(
    relationship: Component<T>,
    target: Entity,
  ): PairComponent<T>;
  pair(relationship: Entity, target: Entity): PairTag;
  pair(relationship: Entity | Component<ComponentDataSchema>, target: Entity) {
    this.backend.checkValid(relationship.data);

    if (relationship instanceof Component) {
      return new PairComponent(
        this.backend.pair(relationship.data, target.data),
        this.backend,
      );
    }
    if (relationship instanceof Entity) {
      return new PairTag(
        this.backend.pair(relationship.data, target.data),
        this.backend,
      );
    }
  }

  lookupEntity(name: string) {
    const entityData = this.backend.lookupEntity(name);
    return entityData ? new Entity(entityData, this.backend) : undefined;
  }

  removeFromAll(component: AnyId | Wildcard): void;
  removeFromAll(
    component: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): void;
  removeFromAll(first: AnyId | Wildcard, second?: AnyComponent | Wildcard) {
    this.backend.removeFromAll(this.mapToBackend([first, second]));
  }

  destructAllWith(component: AnyId | Wildcard): void;
  destructAllWith(
    component: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): void;
  destructAllWith(first: AnyId | Wildcard, second?: AnyComponent | Wildcard) {
    this.backend.destructAllWith(this.mapToBackend([first, second]));
  }

  set<T extends ComponentDataSchema>(
    component: Component<T>,
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

class EntityHandleBase extends BackendHandleBase {
  data: Backend.Entity;

  constructor(data: Backend.Entity, backend: Backend.Backend) {
    super(backend);
    this.data = data;
  }

  getName() {
    return this.backend.getName(this.data);
  }

  setName(name: string) {
    this.backend.setName(this.data, name);
  }

  isSameAs(other: AnyId) {
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

  has(component: AnyId | Wildcard): boolean;
  has(
    relationship: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): boolean;
  has(first: AnyId | Wildcard, second?: AnyComponent | Wildcard): boolean {
    return this.backend.has(this.data, this.mapToBackend([first, second]));
  }

  remove(id: AnyId | Wildcard): void;
  remove(
    relationship: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): void;
  remove(first: AnyId | Wildcard, second?: AnyComponent | Wildcard) {
    this.backend.remove(this.data, this.mapToBackend([first, second]));
  }

  add(component: AnyId): void;
  add(relationship: AnyComponent, target: AnyComponent): void;
  add(first: AnyId, second?: AnyComponent) {
    if (second === undefined) {
      this.backend.add(this.data, first.data);
      return;
    }
    if (first.data instanceof Backend.Entity) {
      this.backend.add(this.data, this.backend.pair(first.data, second.data));
      return;
    }
    throw new Error("Bad arguments for add");
  }

  set<T extends ComponentDataSchema>(
    component: Component<T>,
    newVal: InferType<T>,
  ): void;
  set<T extends ComponentDataSchema>(
    explicitRelationship: PairComponent<T>,
    newVal: InferType<T>,
  ): void;
  set<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(
    component: Component<T1>,
    target: Component<T2>,
    newVal: InferType<T1>,
  ): void;
  set<T extends ComponentDataSchema>(
    component: Component<T>,
    target: Entity,
    newVal: InferType<T>,
  ): void;
  set<T extends ComponentDataSchema>(
    component: Entity,
    target: Component<T>,
    newVal: InferType<T>,
  ): void;
  set<T extends ComponentDataSchema>(
    first: Entity | Component<T> | PairComponent<T>,
    second: AnyComponent | InferType<T>,
    third?: InferType<T>,
  ) {
    if (third === undefined) {
      this.backend.set(this.data, first.data, second);
      return;
    }
    if (
      first.data instanceof Backend.Entity &&
      (second as Entity).data instanceof Backend.Entity
    ) {
      this.backend.set(
        this.data,
        this.backend.pair(first.data, (second as Entity).data),
        third,
      );
      return;
    }

    throw new Error("Invalid arguments for setData");
  }

  get<T extends ComponentDataSchema>(
    component: Component<T>,
  ): InferType<T> | undefined;
  get<T extends ComponentDataSchema>(
    component: PairComponent<T>,
  ): InferType<T> | undefined;
  get<T extends ComponentDataSchema>(
    component: Component<T>,
    target: Entity,
  ): InferType<T> | undefined;
  get<T extends ComponentDataSchema>(
    component: Entity,
    target: Component<T>,
  ): InferType<T> | undefined;
  get<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(
    component: Component<T1>,
    target: Component<T2>,
  ): InferType<T1> | undefined;
  get(
    first: AnyComponent | PairComponent<ComponentDataSchema>,
    second?: AnyComponent,
  ) {
    if (second === undefined) {
      return this.backend.get(this.data, first.data);
    }
    if (
      first.data instanceof Backend.Entity &&
      second.data instanceof Backend.Entity
    ) {
      return this.backend.get(
        this.data,
        this.backend.pair(first.data, second.data),
      );
    }

    throw new Error("Invalid arguments for getData");
  }

  components(): IteratorObject<Tag | PairTag>;
  components(first: AnyComponent | Wildcard): IteratorObject<Tag>;
  components(
    first: AnyComponent | Wildcard,
    second: Wildcard | AnyComponent,
  ): IteratorObject<PairTag>;
  components(
    first?: AnyComponent | Wildcard,
    second?: Wildcard | AnyComponent,
  ): IteratorObject<Tag | PairTag> | IteratorObject<Tag> {
    if (first === undefined) {
      return this.backend
        .getComponents(this.data)
        .map(this.mapFromBackend.bind(this));
    }

    return this.backend
      .getComponents(this.data, this.mapToBackend([first, second]))
      .map(this.mapFromBackend.bind(this));
  }

  findComponent(
    first?: AnyComponent | Wildcard,
    second?: AnyComponent | Wildcard,
  ): Tag | PairTag | undefined {
    const fromBackend = (() => {
      if (first === undefined) return this.backend.findComponent(this.data);
      return this.backend.findComponent(
        this.data,
        this.mapToBackend([first, second]),
      );
    })();
    if (fromBackend === undefined) {
      return undefined;
    }

    return this.mapFromBackend(fromBackend);
  }
}

export class Entity extends EntityHandleBase {
  __entityHandleBrand: undefined = undefined;
}

export type Tag = Entity;

export class Component<
  // needed for type inference when using the handle, even if not used directly here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends ComponentDataSchema,
> extends EntityHandleBase {
  getInitializer() {
    return this.backend.initializer(this.data) as T;
  }
}

class PairHandleBase extends BackendHandleBase {
  data: Backend.Pair;

  constructor(_data: Backend.Pair, backend: Backend.Backend) {
    super(backend);
    this.data = _data;
  }

  relationship() {
    return new Entity(this.data.relationship, this.backend);
  }

  target() {
    return new Entity(this.data.target, this.backend);
  }

  isSameAs(other: AnyId) {
    return this.data === other.data;
  }
}

export class PairTag extends PairHandleBase {
  _tagPairBrand: undefined = undefined;
}

export class PairComponent<
  // needed for type inference when using the handle, even if not used directly here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends ComponentDataSchema,
> extends PairHandleBase {
  _componentPairBrand: undefined = undefined;
}

type Wildcard = { data: Backend.Wildcard };

// function isWildcard(value: { data: unknown }): value is Wildcard {
//   return Backend.isWildcard(value.data);
// }

type AnyComponent = Tag | Component<ComponentDataSchema>;

// function isComponent(value: { data: unknown }): value is AnyComponent {
//   return value.data instanceof Backend.Entity;
// }

type AnyPair = PairTag | PairComponent<ComponentDataSchema>;

function isPair(value: { data: unknown }): value is AnyPair {
  return value.data instanceof Backend.Pair;
}

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// type AnyNoData = Entity | PairTag;

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// type AnyWithData<T extends ComponentDataSchema> =
//   | Component<T>
//   | PairComponent<T>;

type AnyId = AnyComponent | AnyPair;

// function isId(value: { data: unknown }): value is AnyId {
//   return isComponent(value) || isPair(value);
// }

type ComponentDataSchema = {
  parse(val: unknown): unknown;
};

type InferType<T extends ComponentDataSchema> = ReturnType<T["parse"]>;

class Logger implements Backend.ILogger {
  private archetypeGCTracker = new ObjectGCTracker();

  archetypesAdded = 0;
  archetypesDeleted = 0;

  liveArchetypes() {
    this.archetypeGCTracker.clearDead();
    return this.archetypeGCTracker.count();
  }

  addArchetype(archetype: object): void {
    this.archetypeGCTracker.add(archetype);
    this.archetypesAdded++;

    archetype = null as unknown as object; // allow GC to collect the archetype if nothing else is referencing it
  }
  deleteArchetype(): void {
    this.archetypesDeleted++;
  }

  liveLinks() {
    this.linkGCTracker.clearDead();
    return this.linkGCTracker.count();
  }

  private linkGCTracker = new ObjectGCTracker();

  linksAdded = 0;
  linksDeleted = 0;

  addLink(link: object): void {
    this.linkGCTracker.add(link);
    this.linksAdded++;
    link = null as unknown as object; // allow GC to collect the link if nothing else is referencing it
  }
  deleteLink(): void {
    this.linksDeleted++;
  }

  expensiveLookups = 0;
  doExpensiveLookup(): void {
    this.expensiveLookups++;
  }
}
