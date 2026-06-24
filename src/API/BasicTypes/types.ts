import { Component, Entity, Tag } from "./Entity";
import { Pair } from "./Pair";
import { Wildcard } from "./Wildcard";

export type AnySingleId = Entity | Component<unknown>;

export type AnyPairIdObjectWithoutData = Pair<Entity, Entity>;

export type AnyPairIdObjectWithData<T> =
  | Pair<Component<T>, Entity>
  | Pair<Entity, Component<T>>
  | Pair<Component<T>, Component<unknown>>;

export type AnyPairIdObject =
  | AnyPairIdObjectWithoutData
  | AnyPairIdObjectWithData<unknown>;

export type AnyImplicitPairId =
  | [Entity, Entity]
  | [Entity, Component<unknown>]
  | [Component<unknown>, Entity]
  | [Component<unknown>, Component<unknown>];

export type AnyPairId = AnyPairIdObject | AnyImplicitPairId;

export type AnyIdObject = Tag | Component<unknown> | AnyPairIdObject;

export type AnyIdObjectWithData<T> =
  | Component<T>
  | Pair<Component<T>, Entity>
  | Pair<Entity, Component<T>>
  | Pair<Component<T>, Component<unknown>>;

export type AnyId = AnySingleId | AnyPairId;

export type AnyIdWithData<T> =
  | AnyIdObjectWithData<T>
  | [Component<T>, Entity]
  | [Entity, Component<T>]
  | [Component<T>, Component<unknown>];

export type AnySingleIndex = Entity | Component<unknown> | Wildcard;

export type AnyPairIndexObject =
  | Pair<Entity, Entity>
  | Pair<Component<unknown>, Entity>
  | Pair<Entity, Component<unknown>>
  | Pair<Component<unknown>, Component<unknown>>
  | Pair<Wildcard, Wildcard>
  | Pair<Entity, Wildcard>
  | Pair<Wildcard, Entity>
  | Pair<Component<unknown>, Wildcard>
  | Pair<Wildcard, Component<unknown>>;

export type AnyImplicitPairIndex =
  | AnyImplicitPairId
  | [Entity, Wildcard]
  | [Component<unknown>, Wildcard]
  | [Wildcard, Wildcard]
  | [Wildcard, Entity]
  | [Wildcard, Component<unknown>];

export type AnyPairIndex = AnyPairIndexObject | AnyImplicitPairIndex;

export type AnyIndex = AnySingleIndex | AnyPairIndex;
