import * as Backend from "#/Backend";

import { Component, Entity } from "./Entity";
import { AnyIdObject, AnySingleIndex } from "./types";

export class Pair<First extends AnySingleIndex, Second extends AnySingleIndex> {
  #first: First;
  #second: Second;
  data: PairBackendObject<First, Second>;
  private backend: Backend.Backend;

  constructor(
    first: First,
    second: Second,
    data: PairBackendObject<First, Second>,
    backend: Backend.Backend,
  ) {
    this.#first = first;
    this.#second = second;
    this.data = data;
    this.backend = backend;
  }

  first() {
    return this.#first;
  }
  second() {
    return this.#second;
  }

  getName() {
    return this.backend.getDisplayName(this.data);
  }

  isSameAs(other: AnyIdObject) {
    if (other instanceof Pair) return this.data === other.data;

    return false;
  }

  hasData() {
    if (this.data.constructor === Backend.Pair) {
      return this.data.hasData();
    }
    return false;
  }
}

export function isPairObject(
  x: unknown,
): x is Pair<AnySingleIndex, AnySingleIndex> {
  return x instanceof Pair;
}

export type PairBackendObject<
  First extends AnySingleIndex,
  Second extends AnySingleIndex,
> = First extends Entity | Component<unknown>
  ? Second extends Entity | Component<unknown>
    ? Backend.Pair
    : Backend.RelationshipWildcard
  : Second extends Entity | Component<unknown>
    ? Backend.WildcardTarget
    : Backend.DoubleWildcard;
