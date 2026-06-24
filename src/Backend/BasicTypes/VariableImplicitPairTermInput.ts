import {
  Entity,
  isImplicitPair,
  isVariable,
  StringLookup,
  Variable,
  Wildcard,
} from "./";

export type VariableImplicitPairTermInput =
  | [Entity, Variable]
  | [Variable, Entity]
  | [Wildcard, Variable]
  | [Variable, Wildcard]
  | [StringLookup, Variable]
  | [Variable, StringLookup]
  | [Variable, Variable];

export function isVariableImplicitPairTermInput(
  x: unknown,
): x is VariableImplicitPairTermInput {
  return isImplicitPair(x) && (isVariable(x[0]) || isVariable(x[1]));
}
