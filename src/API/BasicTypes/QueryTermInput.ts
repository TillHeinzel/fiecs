import * as Tup from "#/Utility/Tuples";

import {
  AnyIndex,
  AnySingleIndex,
  isAnyIndex,
  isAnyPairIndex,
  isAnySingleIndex,
  isImplicitPair,
  isString,
} from "./";
import { Component, Entity } from "./Entity";
import {
  isVariable,
  isVariableString,
  StringLookup,
  Variable,
  VariableString,
} from "./Variable";
import { Wildcard } from "./Wildcard";

export type QueryTermBase =
  | AnyIndex
  | StringLookup
  | Variable
  | Readonly<
      Tup.CartesianProductOfTypes<
        [Entity, Component<unknown>, Wildcard, Variable, StringLookup],
        [Entity, Component<unknown>, Wildcard, Variable, StringLookup]
      >
    >;

export function mapStringInputs(i: QueryTermInput): QueryTermBase {
  if (isImplicitPair(i))
    return [
      mapSingleStringInput(i[0]),
      mapSingleStringInput(i[1]),
    ] as QueryTermBase;

  if (isAnyPairIndex(i)) return i;

  return mapSingleStringInput(i);
}

export function mapSingleStringInput(
  i: AnySingleIndex | string | StringLookup | Variable,
) {
  if (isVariableString(i)) return new Variable(i.slice(1));
  else if (isString(i)) return new StringLookup(i);
  else return i;
}

export type QueryTermInput =
  | QueryTermBase
  | string
  | Readonly<
      Tup.CartesianProductOfTypes<
        [
          Entity,
          Component<unknown>,
          Wildcard,
          Variable,
          StringLookup,
          string,
          VariableString<string>,
        ],
        [
          Entity,
          Component<unknown>,
          Wildcard,
          Variable,
          StringLookup,
          string,
          VariableString<string>,
        ]
      >
    >;

export function isQueryTermInput(x: unknown): x is QueryTermInput {
  return (
    isAnyIndex(x) ||
    isString(x) ||
    isVariable(x) ||
    (isImplicitPair(x) &&
      isAnySingleQueryTermInput(x[0]) &&
      isAnySingleQueryTermInput(x[1]))
  );
}

function isAnySingleQueryTermInput(
  x: unknown,
): x is AnySingleIndex | string | Variable {
  return isAnySingleIndex(x) || isString(x) || isVariable(x);
}
