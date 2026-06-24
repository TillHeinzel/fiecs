import * as Tup from "#/Utility/Tuples";

import {
  AnyIdWithData,
  Component,
  Entity,
  isAnyIdWithData,
  isComponent,
  isImplicitPair,
  isPairObject,
  isWildcard,
  mapSourceStringInput,
  mapStringInputs,
  Pair,
  QueryTermInput,
  Variable,
  VariableString,
  Wildcard,
} from "../BasicTypes";
import {
  AnyBasicField,
  BasicField,
  BasicFieldAccessType,
  isBasicTerm,
} from "./BasicField";
import { AnyBasicFilter, BasicFilter, isBasicFilter } from "./BasicFilter";
import { AnyDependentTerm, isDependentTerm } from "./DependentTerm";
import { AnyNotTerm, isNotTerm } from "./NotTerm";
import { AnyOneOfTerm, isOneOfTerm } from "./OneOf";
import { AnyOptionalTerm, isOptionalTerm } from "./Optional";
import { TermCore } from "./TermCore";

export type QueryTermAble =
  | QueryTermInput
  | AnyBasicField
  | AnyBasicFilter
  | AnyNotTerm
  | AnyOptionalTerm
  | AnyOneOfTerm
  | AnyDependentTerm;

export function mapToTerms<Ts extends QueryTermAble[]>(ts: Ts): MapToTerms<Ts> {
  return ts.map((t) =>
    isBasicTerm(t) ||
    isBasicFilter(t) ||
    isNotTerm(t) ||
    isOptionalTerm(t) ||
    isOneOfTerm(t) ||
    isDependentTerm(t)
      ? t
      : chooseTerm(t),
  ) as MapToTerms<Ts>;
}

export type MapToTerms<Ts extends readonly QueryTermAble[]> = {
  [Index in keyof Ts]: TermType<Ts[Index]>;
};

type TermType<T extends QueryTermAble> = T extends QueryTermInput
  ? DefaultTermType<T>
  : T;

export function chooseTerm(t: QueryTermInput) {
  if (isFieldDefaultInput(t)) return makeField(t);
  return makeFilter(t);
}

type DefaultTermType<T extends QueryTermInput> =
  T extends FieldDefaultInput<infer Type> ? DefaultField<Type> : DefaultFilter;

export type DefaultFilter = BasicFilter<"this">;
export function makeFilter(t: QueryTermInput): DefaultFilter {
  return new BasicFilter(makeTermCore(t, "FilterOnly"));
}

export type DefaultField<T> = BasicField<T, "DefaultAccess", "this">;
export function makeField(t: QueryTermInput): DefaultField<unknown> {
  return makeBasicTerm(t, "DefaultAccess");
}

export function makeBasicTerm<A extends BasicFieldAccessType>(
  t: QueryTermInput,
  accessor: A,
): BasicField<unknown, A, "this"> {
  return new BasicField(makeTermCore(t, accessor));
}

export function makeTermCore<A>(t: QueryTermInput, accessor: A) {
  return new TermCore(
    mapStringInputs(t),
    accessor,
    mapSourceStringInput("$this"),
    "this" as const,
  );
}

export type FieldDefaultInput<T> =
  | AnyIdWithData<T>
  | Pair<Component<T>, Wildcard>
  | Tup.CartesianProductOfTypes<
      [Component<T>],
      [
        Entity,
        Wildcard,
        Variable,
        VariableString<string>,
        string,
        Component<unknown>,
      ]
    >;

function isFieldDefaultInput(x: unknown): x is FieldDefaultInput<unknown> {
  return (
    isAnyIdWithData(x) ||
    (isPairObject(x) && isComponent(x.first()) && isWildcard(x.second())) ||
    (isImplicitPair(x) && isComponent(x[0]))
  );
}

export type FilterDefaultInput = Exclude<
  QueryTermInput,
  FieldDefaultInput<unknown>
>;
