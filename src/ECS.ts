import * as Backend from "./Backend";
import { builtinTraits } from "./builtinTraits";
import { ObjectGCTracker } from "./Utility/GC.testutility";

class BackendHandleBase {
  protected backend: Backend.Backend;

  constructor(backend: Backend.Backend) {
    this.backend = backend;
  }

  protected mapIdFromBackend(
    component: Backend.Entity | Backend.Pair,
  ):
    | Tag
    | PairTag
    | Component<ComponentDataSchema>
    | PairComponent<ComponentDataSchema>;
  // protected mapFromBackend(
  //   component: AnySingle,
  // ):
  //   | Wildcard
  //   | Tag
  //   | PairTag
  //   | Component<ComponentDataSchema>
  //   | PairComponent<ComponentDataSchema>
  //   | RelationshipWildcard
  //   | RelationshipWildcardComponent<ComponentDataSchema>
  //   | WildcardTarget
  //   | DoubleWildcard;
  protected mapIdFromBackend(
    component: Backend.Entity | Backend.Pair,
  ):
    | Tag
    | PairTag
    | Component<ComponentDataSchema>
    | PairComponent<ComponentDataSchema> {
    // | Wildcard
    // | RelationshipWildcard
    // | RelationshipWildcardComponent<ComponentDataSchema>
    // | WildcardTarget
    // | DoubleWildcard
    if (component instanceof Backend.Entity) {
      if (component.hasData()) {
        return new Component(component, this.backend);
      }
      return new Entity(component as unknown as Backend.Entity, this.backend);
    } else if (component instanceof Backend.Pair) {
      if (component.hasData()) {
        return new PairComponent(component, this.backend);
      }
      return new PairTag(component as unknown as Backend.Pair, this.backend);
    }
    throw new Error("Invalid component from backend");
  }

  protected mapToBackend([first, second]: [
    AnySingle,
    AnyPairPart | undefined,
  ]):
    | Backend.Entity
    | Backend.Pair
    | Backend.Wildcard
    | Backend.DoubleWildcard
    | Backend.RelationshipWildcard
    | Backend.WildcardTarget {
    if (first === undefined) {
      throw new Error(
        ` cannot map to backend with undefined first argument. Received: ${JSON.stringify([first, second])}`,
      );
    }
    if (second === undefined) {
      return first.data;
    }
    if (isPair(first)) {
      throw new Error("Cannot create a pair with a pair as the relationship");
    }
    if (isComponent(first) && isComponent(second)) {
      return this.backend.pair(first.data, second.data);
    }
    if (isComponent(first) && isWildcard(second)) {
      return this.backend.relationshipWildcard(first.data);
    }
    if (isWildcard(first) && isComponent(second)) {
      return this.backend.wildcardTarget(second.data);
    }
    if (isWildcard(first) && isWildcard(second)) {
      return this.backend.doubleWildcard;
    }

    throw new Error(
      `Invalid arguments for mapToBackend: ${JSON.stringify([first, second])}`,
    );
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

  pair(relationship: Wildcard, target: Wildcard): DoubleWildcard;
  pair(relationship: Entity, target: Wildcard): RelationshipWildcard;
  pair<T extends ComponentDataSchema>(
    relationship: Component<T>,
    target: Wildcard,
  ): RelationshipWildcardComponent<T>;
  pair(relationship: Wildcard, target: Entity): WildcardTarget;
  pair<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(
    relationship: Component<T1>,
    target: Component<T2>,
  ): PairComponent<T1>;
  pair<T extends ComponentDataSchema>(
    relationship: Entity,
    target: Component<T>,
  ): PairComponent<T>;
  pair<T extends ComponentDataSchema>(
    relationship: Component<T>,
    target: Entity,
  ): PairComponent<T>;
  pair(relationship: Entity, target: Entity): PairTag;
  pair(first: AnyComponent | Wildcard, second: AnyComponent | Wildcard) {
    if (isComponent(first)) {
      this.backend.checkValid(first.data);
    }

    const backendObject = this.mapToBackend([first, second]);

    if (backendObject instanceof Backend.Pair) {
      return this.mapIdFromBackend(backendObject);
    } else if (Backend.isDoubleWildcard(backendObject)) {
      return { data: backendObject } as DoubleWildcard;
    } else if (Backend.isRelationshipWildcard(backendObject)) {
      if (backendObject.relationship.hasData()) {
        return new RelationshipWildcardComponent(backendObject, this.backend);
      }
      return new RelationshipWildcard(backendObject, this.backend);
    } else if (Backend.isWildcardTarget(backendObject)) {
      return new WildcardTarget(backendObject, this.backend);
    }

    throw new Error("Invalid arguments for pair");
  }

  lookupEntity(name: string) {
    const entityData = this.backend.lookupEntity(name);
    return entityData ? new Entity(entityData, this.backend) : undefined;
  }

  removeFromAll(component: AnySingle): void;
  removeFromAll(
    component: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): void;
  removeFromAll(first: AnySingle, second?: AnyComponent | Wildcard) {
    this.backend.removeFromAll(this.mapToBackend([first, second]));
  }

  destructAllWith(component: AnySingle): void;
  destructAllWith(
    component: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): void;
  destructAllWith(first: AnySingle, second?: AnyComponent | Wildcard) {
    this.backend.destructAllWith(this.mapToBackend([first, second]));
  }

  set<T extends ComponentDataSchema>(
    component: Component<T>,
    newVal: InferType<T>,
  ): void {
    this.backend.add(component.data, this.builtin.Singleton.data);
    this.backend.set(component.data, component.data, newVal);
  }

  query<T extends QueryT>(queryO: T) {
    const query = this.backend.makeQuery(queryO.data);
    return {
      matches: () =>
        query
          .archetypeWithMatches()
          .entries()
          .flatMap(([archetype, matches]) =>
            matches.map((match) => [archetype, match] as const),
          )
          .flatMap(([archetype, match]) =>
            archetype.entities.keys().map((entity) => ({
              entity: new Entity(entity, this.backend),
              match: match.map((m) => this.mapIdFromBackend(m)) as MatchType<T>,
            })),
          ),
    };
  }

  _debugBackendOperationIsDirty() {
    // @ts-expect-error // exposing for testing purposes, not part of public API
    return this.backend.operation.isDirty();
  }
}

type QueryT =
  | Tag
  | Component<ComponentDataSchema>
  | PairTag
  | PairComponent<ComponentDataSchema>
  | And<unknown[]>
  | Or<unknown[]>
  | Wildcard;

// prettier-ignore
type MatchType<T> =
  T extends Tag
    ? Boxed<T>
: T extends Component<ComponentDataSchema>
    ? Boxed<T>
: T extends PairTag
    ? Boxed<T>
: T extends PairComponent<ComponentDataSchema>
    ? Boxed<T>
: T extends And<infer Ts>
    ? Flatten<{ [K in keyof Ts]: MatchType<Ts[K]> }>
: T extends Or<infer Ts>
    ? Boxed<{ [K in keyof Ts]: MatchType<Ts[K]> }[number]>
: T extends Wildcard
    ? [unknown]
: never;

type Boxed<T> = T extends unknown[] ? T : [T];

type Flatten<T> = T extends []
  ? []
  : T extends [infer T0]
    ? [...Flatten<T0>]
    : T extends [infer T0, ...infer Ts]
      ? [...Flatten<T0>, ...Flatten<Ts>]
      : [T];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class And<Ts extends unknown[]> {
  _andBrand: undefined = undefined;

  data: Backend.And;

  constructor(data: Backend.And) {
    this.data = data;
  }
}

export function and<Ts extends QueryT[]>(...subs: Ts): And<Ts> {
  return new And(Backend.and(...subs.map((c) => c.data)));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Or<Ts extends unknown[]> {
  _orBrand: undefined = undefined;

  data: Backend.Or;

  constructor(data: Backend.Or) {
    this.data = data;
  }
}

export function or<Ts extends QueryT[]>(...subs: Ts): Or<Ts> {
  return new Or(Backend.or(...subs.map((c) => c.data)));
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
    return this;
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
    return this;
  }

  type(): AnyId[] {
    const archetype = this.data.archetype;

    if (archetype === undefined) return [];

    return [...archetype.components].map(this.mapIdFromBackend.bind(this));
  }

  has(component: AnySingle): boolean;
  has(
    relationship: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): boolean;
  has(first: AnySingle, second?: AnyComponent | Wildcard): boolean {
    return this.backend.has(this.data, this.mapToBackend([first, second]));
  }

  remove(id: AnySingle): this;
  remove(
    relationship: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): this;
  remove(first: AnySingle, second?: AnyComponent | Wildcard) {
    this.backend.remove(this.data, this.mapToBackend([first, second]));
    return this;
  }

  add(component: AnyId): this;
  add(relationship: AnyComponent, target: AnyComponent): this;
  add(first: AnyId, second?: AnyComponent) {
    if (second === undefined) {
      this.backend.add(this.data, first.data);
      return this;
    }
    if (first.data instanceof Backend.Entity) {
      this.backend.add(this.data, this.backend.pair(first.data, second.data));
      return this;
    }
    throw new Error("Bad arguments for add");
  }

  set<T extends ComponentDataSchema>(
    component: Component<T>,
    newVal: InferType<T>,
  ): this;
  set<T extends ComponentDataSchema>(
    explicitRelationship: PairComponent<T>,
    newVal: InferType<T>,
  ): this;
  set<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(
    component: Component<T1>,
    target: Component<T2>,
    newVal: InferType<T1>,
  ): this;
  set<T extends ComponentDataSchema>(
    component: Component<T>,
    target: Entity,
    newVal: InferType<T>,
  ): this;
  set<T extends ComponentDataSchema>(
    component: Entity,
    target: Component<T>,
    newVal: InferType<T>,
  ): this;
  set<T extends ComponentDataSchema>(
    first: Entity | Component<T> | PairComponent<T>,
    second: AnyComponent | InferType<T>,
    third?: InferType<T>,
  ): this {
    if (third === undefined) {
      this.backend.set(this.data, first.data, second);
      return this;
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
      return this;
    }

    throw new Error("Invalid arguments for setData");
  }

  get<T extends AnyWithData>(component: T): InferComponentType<T> | undefined;
  get<T extends Component<ComponentDataSchema>>(
    component: T,
    target: Entity,
  ): InferComponentType<T> | undefined;
  get<T extends Component<ComponentDataSchema>>(
    component: Entity,
    target: T,
  ): InferComponentType<T> | undefined;
  get<
    T1 extends Component<ComponentDataSchema>,
    T2 extends Component<ComponentDataSchema>,
  >(component: T1, target: T2): InferComponentType<T1> | undefined;
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
  components(first: AnySingle): IteratorObject<Tag>;
  components(
    first: AnyComponent | Wildcard,
    second: Wildcard | AnyComponent,
  ): IteratorObject<PairTag>;
  components(
    first?: AnySingle,
    second?: Wildcard | AnyComponent,
  ):
    | IteratorObject<
        | Tag
        | Component<ComponentDataSchema>
        | PairTag
        | PairComponent<ComponentDataSchema>
      >
    | IteratorObject<Tag | Component<ComponentDataSchema>>
    | IteratorObject<PairTag | PairComponent<ComponentDataSchema>> {
    if (first === undefined) {
      return this.backend
        .getComponents(this.data)
        .map(this.mapIdFromBackend.bind(this));
    }

    return this.backend
      .getComponents(this.data, this.mapToBackend([first, second]))
      .map(this.mapIdFromBackend.bind(this));
  }

  findComponent(
    first?: AnySingle,
    second?: AnyComponent | Wildcard,
  ):
    | Tag
    | PairTag
    | Component<ComponentDataSchema>
    | PairComponent<ComponentDataSchema>
    | undefined {
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

    return this.mapIdFromBackend(fromBackend);
  }
}

export class Entity extends EntityHandleBase {
  // __entityHandleBrand: undefined = undefined;
}

export type Tag = Entity;

export class Component<T extends ComponentDataSchema> extends EntityHandleBase {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DoubleWildcard = { data: Backend.DoubleWildcard };

class RelationshipWildcard extends BackendHandleBase {
  _relationshipWildcardBrand: undefined = undefined;
  data: Backend.RelationshipWildcard;

  constructor(data: Backend.RelationshipWildcard, backend: Backend.Backend) {
    super(backend);
    this.data = data;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class RelationshipWildcardComponent<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends ComponentDataSchema,
> extends BackendHandleBase {
  _relationshipWildcardComponentBrand: undefined = undefined;
  data: Backend.RelationshipWildcard;

  constructor(data: Backend.RelationshipWildcard, backend: Backend.Backend) {
    super(backend);
    this.data = data;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class WildcardTarget extends BackendHandleBase {
  _wildcardTargetBrand: undefined = undefined;
  data: Backend.WildcardTarget;

  constructor(data: Backend.WildcardTarget, backend: Backend.Backend) {
    super(backend);
    this.data = data;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isWildcard(value: { data: unknown }): value is Wildcard {
  return Backend.isWildcard(value.data);
}

type AnyComponent = Tag | Component<ComponentDataSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isComponent(value: { data: unknown }): value is AnyComponent {
  return value.data instanceof Backend.Entity;
}

type AnyPair = PairTag | PairComponent<ComponentDataSchema>;

function isPair(value: { data: unknown }): value is AnyPair {
  return value.data instanceof Backend.Pair;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AnyNoData = Entity | PairTag;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AnyWithData =
  | Component<ComponentDataSchema>
  | PairComponent<ComponentDataSchema>;

type AnyId = AnyComponent | AnyPair;

// function isId(value: { data: unknown }): value is AnyId {
//   return isComponent(value) || isPair(value);
// }

type ComponentDataSchema = {
  parse(val: unknown): unknown;
};

type InferType<T extends ComponentDataSchema> = ReturnType<T["parse"]>;

type InferComponentType<T> =
  T extends Component<infer U>
    ? InferType<U>
    : T extends PairComponent<infer U>
      ? InferType<U>
      : never;

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

type AnySingle =
  | AnyId
  | Wildcard
  | RelationshipWildcard
  | WildcardTarget
  | DoubleWildcard;

type AnyPairPart = AnyComponent | Wildcard;
