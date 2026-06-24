import {
  isQueryTermInput,
  mapStringInputs,
  QueryTermInput,
  Variable,
} from "../BasicTypes";
import { SourceType } from "../Query";
import { BasicField, isBasicTerm } from "./BasicField";
import { BasicFilter, isBasicFilter } from "./BasicFilter";
import { DependentTerm } from "./DependentTerm";
import {
  chooseTerm,
  DefaultField,
  DefaultFilter,
  FieldDefaultInput,
  FilterDefaultInput,
  makeBasicTerm,
  makeField,
  makeFilter,
  makeTermCore,
  mapToTerms,
  MapToTerms,
} from "./MapToTerms";
import { AnyNotTerm, NotTerm } from "./NotTerm";
import { OneOfInput, OneOfTerm } from "./OneOf";
import { AnyOptionalTerm, OptionalAccessTypes, OptionalTerm } from "./Optional";

export function variable(varName: string) {
  return new Variable(varName);
}

export function term<T>(t: FieldDefaultInput<T>): DefaultField<T>;
export function term(t: FilterDefaultInput): DefaultFilter;
export function term(t: QueryTermInput) {
  return chooseTerm(mapStringInputs(t));
}

export function filter(t: QueryTermInput): BasicFilter<"this"> {
  return makeFilter(mapStringInputs(t));
}

export function field<T>(
  t: FieldDefaultInput<T>,
): BasicField<T, "DefaultAccess", "this">;
export function field<T>(
  t: FilterDefaultInput,
): BasicField<T, "DefaultAccess", "this">;
export function field(
  t: FilterDefaultInput,
): BasicField<unknown, "DefaultAccess", "this">;
export function field(t: QueryTermInput) {
  return makeField(mapStringInputs(t));
}

export function readWrite<T>(
  t: FieldDefaultInput<T>,
): BasicField<T, "ReadWrite", "this">;
export function readWrite<T>(
  t: FilterDefaultInput,
): BasicField<T, "ReadWrite", "this">;
export function readWrite(
  t: FilterDefaultInput,
): BasicField<unknown, "ReadWrite", "this">;
export function readWrite(t: QueryTermInput) {
  return makeBasicTerm(t, "ReadWrite");
}

export function readOnly<T>(
  t: FieldDefaultInput<T>,
): BasicField<T, "ReadOnly", "this">;
export function readOnly<T>(
  t: FilterDefaultInput,
): BasicField<T, "ReadOnly", "this">;
export function readOnly(
  t: FilterDefaultInput,
): BasicField<unknown, "ReadOnly", "this">;
export function readOnly(t: QueryTermInput) {
  return makeBasicTerm(t, "ReadOnly");
}

export function writeOnly<T>(
  t: FieldDefaultInput<T>,
): BasicField<T, "WriteOnly", "this">;
export function writeOnly<T>(
  t: FilterDefaultInput,
): BasicField<T, "WriteOnly", "this">;
export function writeOnly(
  t: FilterDefaultInput,
): BasicField<unknown, "WriteOnly", "this">;
export function writeOnly(t: QueryTermInput) {
  return makeBasicTerm(t, "WriteOnly");
}

export function noAccess<T>(
  t: FieldDefaultInput<T>,
): BasicField<T, "NoAccess", "this">;
export function noAccess<T>(
  t: FilterDefaultInput,
): BasicField<T, "NoAccess", "this">;
export function noAccess(
  t: FilterDefaultInput,
): BasicField<unknown, "NoAccess", "this">;
export function noAccess(t: QueryTermInput) {
  return makeBasicTerm(t, "NoAccess");
}

export function defaultAccess<T>(
  t: FieldDefaultInput<T>,
): BasicField<T, "DefaultAccess", "this">;
export function defaultAccess<T>(
  t: FilterDefaultInput,
): BasicField<T, "DefaultAccess", "this">;
export function defaultAccess(
  t: FilterDefaultInput,
): BasicField<unknown, "DefaultAccess", "this">;
export function defaultAccess(t: QueryTermInput) {
  return makeBasicTerm(t, "DefaultAccess");
}

export function not(t: QueryTermInput): NotTerm<"this">;
export function not<S extends SourceType>(t: BasicFilter<S>): NotTerm<S>;
export function not(t: QueryTermInput | BasicFilter<SourceType>): AnyNotTerm {
  if (isBasicFilter(t)) return new NotTerm(t.data);
  if (!isQueryTermInput(t)) throw new Error("bad input for not(t)");
  return new NotTerm(makeTermCore(t, "FilterOnly"));
}

export function optional<T>(
  t: FieldDefaultInput<T>,
): OptionalTerm<T | undefined, "DefaultAccess", "this">;
export function optional<T>(
  t: FilterDefaultInput,
): OptionalTerm<T | undefined, "DefaultAccess", "this">;
export function optional(
  t: FilterDefaultInput,
): OptionalTerm<unknown, "DefaultAccess", "this">;
export function optional<
  T,
  A extends OptionalAccessTypes,
  S extends SourceType,
>(t: BasicField<T, A, S>): OptionalTerm<T, A, S>;
export function optional(
  t: QueryTermInput | BasicField<unknown, OptionalAccessTypes, SourceType>,
): AnyOptionalTerm {
  if (isBasicTerm(t)) return new OptionalTerm(t.data);

  if (isBasicFilter(t)) throw new Error("optional terms cannot be filters");

  return new OptionalTerm(makeTermCore(t, "DefaultAccess"));
}

export function dependent(t: QueryTermInput) {
  return new DependentTerm(makeTermCore(t, "ReadWrite"));
}

export function oneOf<
  T1 extends OneOfInput | QueryTermInput,
  Ts extends (OneOfInput | QueryTermInput)[],
>(t1: T1, ...ts: Ts) {
  if (t1 === undefined) throw new Error("oneOf needs at least one input");

  return new OneOfTerm<MapToTerms<[T1, ...Ts]>>(mapToTerms([t1, ...ts]));
}
