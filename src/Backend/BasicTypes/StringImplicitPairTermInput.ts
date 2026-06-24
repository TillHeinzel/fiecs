import {
  Entity,
  isEntity,
  isImplicitPair,
  isStringlookup,
  isWildcard,
  StringLookup,
  Wildcard,
} from "./";

export type StringImplicitPairTermInput =
  | [Entity, StringLookup]
  | [StringLookup, Entity]
  | [Wildcard, StringLookup]
  | [StringLookup, Wildcard]
  | [StringLookup, StringLookup];

export function isStringLookupPairTermInput(
  x: unknown,
): x is StringImplicitPairTermInput {
  return (
    isImplicitPair(x) &&
    (isStringlookup(x[0]) || isStringlookup(x[1])) &&
    (isStringlookup(x[0]) || isEntity(x[0]) || isWildcard(x[0])) &&
    (isStringlookup(x[1]) || isEntity(x[1]) || isWildcard(x[1]))
  );
}
