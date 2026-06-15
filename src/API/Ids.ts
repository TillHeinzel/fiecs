import * as Backend from "#/Backend";

import { AnyPair, mapIdFromBackend, mapToBackend } from "./mapWithBackend";
import {
  DoubleWildcard,
  RelationshipWildcard,
  Wildcard,
  WildcardTarget,
} from "./Wildcard";

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

    return [...archetype.components].map((component) =>
      mapIdFromBackend(component, this.backend),
    );
  }

  has(component: AnySingle): boolean;
  has(
    relationship: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): boolean;
  has(first: AnySingle, second?: AnyComponent | Wildcard): boolean {
    return this.backend.has(
      this.data,
      mapToBackend([first, second], this.backend),
    );
  }

  remove(id: AnySingle): this;
  remove(
    relationship: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): this;
  remove(first: AnySingle, second?: AnyComponent | Wildcard) {
    this.backend.remove(this.data, mapToBackend([first, second], this.backend));
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
    second: AnyComponent | Wildcard,
  ): IteratorObject<PairTag>;
  components(
    first?: AnySingle,
    second?: AnyComponent | Wildcard,
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
        .map((component) => mapIdFromBackend(component, this.backend));
    }

    return this.backend
      .getComponents(this.data, mapToBackend([first, second], this.backend))
      .map((component) => mapIdFromBackend(component, this.backend));
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
        mapToBackend([first, second], this.backend),
      );
    })();
    if (fromBackend === undefined) {
      return undefined;
    }

    return mapIdFromBackend(fromBackend, this.backend);
  }

  childOf(parent: Entity) {
    this.backend.add(
      this.data,
      this.backend.pair(this.backend.builtin.ChildOf, parent.data),
    );
    return this;
  }

  getParent() {
    const parentData = this.backend.findComponent(
      this.data,
      this.backend.relationshipWildcard(this.backend.builtin.ChildOf),
    ) as Backend.Pair | undefined;
    if (parentData === undefined) {
      return undefined;
    }
    return new Entity(parentData.target, this.backend);
  }

  getChildren() {
    return this.backend.queryBuilder
      .build(this.backend.pair(this.backend.builtin.ChildOf, this.data))
      .archetypeWithMatches()
      .keys()
      .flatMap((archetype) => archetype.entities.keys())
      .map((entity) => new Entity(entity, this.backend));
  }
}

export class Entity extends EntityHandleBase {}

export type Tag = Entity;

export class Component<T extends ComponentDataSchema> extends EntityHandleBase {
  getInitializer() {
    return this.backend.initializer(this.data) as T;
  }
}
class PairHandleBase {
  data: Backend.Pair;
  backend: Backend.Backend;

  constructor(_data: Backend.Pair, backend: Backend.Backend) {
    this.backend = backend;
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
export type AnyId = AnyComponent | AnyPair;
export type AnyComponent = Tag | Component<ComponentDataSchema>;

export type AnyWithData =
  | Component<ComponentDataSchema>
  | PairComponent<ComponentDataSchema>;

export type ComponentDataSchema = {
  parse(val: unknown): unknown;
};

export type InferType<T extends ComponentDataSchema> = ReturnType<T["parse"]>;

export type InferComponentType<T> =
  T extends Component<infer U>
    ? InferType<U>
    : T extends PairComponent<infer U>
      ? InferType<U>
      : never;

export type AnySingle =
  | AnyId
  | Wildcard
  | RelationshipWildcard
  | WildcardTarget
  | DoubleWildcard;
