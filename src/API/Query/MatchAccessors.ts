import {
  AnyIdObject,
  AnyIdObjectWithData,
  AnyPairIdObject,
  AnySingleId,
  Entity,
  isAnyIdWithData,
  isAnyPairIdObject,
  isAnySingleId,
} from "../BasicTypes";

class AccessorsBase<T> {
  protected component: AnyIdObject | undefined;
  protected source: Entity;

  constructor(component: AnyIdObject | undefined, source: Entity) {
    this.component = component;
    this.source = source;
  }

  getSource(): Entity {
    return this.source;
  }

  getComponent(): AnySingleId | undefined {
    if (isAnySingleId(this.component)) return this.component;
    return undefined;
  }

  getPair(): AnyPairIdObject | undefined {
    if (isAnyPairIdObject(this.component)) return this.component;
    return undefined;
  }

  protected get_impl(): T {
    if (isAnyIdWithData(this.component)) {
      return this.source.get(this.component)! as T;
    }
    if (this.component === undefined) return undefined as T;
    throw new Error(
      `cannot get data for a component without data (component: "${this.component.getName()}")`,
    );
  }

  protected set_impl(value: T): void {
    if (this.component === undefined)
      throw new Error(
        "cannot use set on an optional term that did not match anything",
      );

    if (isAnyIdWithData(this.component)) {
      this.source.set(this.component, value);
      return;
    }

    throw new Error(
      `cannot set data for a component without data (component: "${this.component.getName()}")`,
    );
  }

  protected is_same_as_impl(t: AnyIdObjectWithData<unknown>) {
    if (this.component === undefined) return false;
    return this.component.isSameAs(t);
  }
}

export class ReadWrite<T> extends AccessorsBase<T> {
  _readWriteAccessorBrand = "readWrite";

  type() {
    return "ReadWrite" as const;
  }

  hasGet(): boolean {
    return true;
  }
  hasSet(): boolean {
    return true;
  }
  get() {
    return this.get_impl();
  }

  set(value: T): void {
    this.set_impl(value);
  }

  isSameAs<T>(t: AnyIdObjectWithData<T>): this is ReadWrite<T> {
    return this.is_same_as_impl(t);
  }
}

export class ReadOnly<T> extends AccessorsBase<T> {
  _readOnlyAccessorBrand = "readOnly";
  type() {
    return "ReadOnly" as const;
  }
  get(): T {
    return this.get_impl();
  }

  hasGet(): boolean {
    return true;
  }
  hasSet(): boolean {
    return false;
  }
  isSameAs<T>(t: AnyIdObjectWithData<T>): this is ReadOnly<T> {
    return this.is_same_as_impl(t);
  }
}

export class WriteOnly<T> extends AccessorsBase<T> {
  _writeOnlyAccessorBrand = "writeOnly";
  type() {
    return "WriteOnly" as const;
  }
  set(value: T): void {
    this.set_impl(value);
  }
  hasGet(): boolean {
    return false;
  }
  hasSet(): boolean {
    return true;
  }
  isSameAs<T>(t: AnyIdObjectWithData<T>): this is ReadWrite<T> {
    return this.is_same_as_impl(t);
  }
}

export class NoAccess<T> extends AccessorsBase<T> {
  type() {
    return "NoAccess" as const;
  }
  _noAccessAccessorBrand = "noAccess";
  isSameAs<T>(t: AnyIdObjectWithData<T>): this is ReadWrite<T> {
    return this.is_same_as_impl(t);
  }
  hasGet(): boolean {
    return false;
  }
  hasSet(): boolean {
    return false;
  }
}

export type Accessor<T> =
  | ReadWrite<T>
  | ReadOnly<T>
  | WriteOnly<T>
  | NoAccess<T>;

export type AnyAccessor = Accessor<unknown>;

export type AccessType =
  | "ReadWrite"
  | "ReadOnly"
  | "WriteOnly"
  | "NoAccess"
  | "FilterOnly";

export function mapToAccessor(a: AccessType) {
  switch (a) {
    case "FilterOnly":
      return undefined;
    case "ReadWrite":
      return ReadWrite;
    case "ReadOnly":
      return ReadOnly;
    case "WriteOnly":
      return WriteOnly;
    case "NoAccess":
      return NoAccess;
  }
}

export type MapToAccessor<A extends AccessType, Type> = A extends "FilterOnly"
  ? undefined
  : A extends "ReadWrite"
    ? ReadWrite<Type>
    : A extends "ReadOnly"
      ? ReadOnly<Type>
      : A extends "WriteOnly"
        ? WriteOnly<Type>
        : A extends "NoAccess"
          ? NoAccess<Type>
          : never;
