import { Backend } from "#/Backend";

import { TermSourceIn } from "../BasicTypes";
import {
  DatatypePlaceholder,
  SourceType,
  Term,
  VariableUseStyle,
} from "../Query";
import { AccessType } from "../Query/MatchAccessors";
import { TermCore } from "./TermCore";

export type OptionalAccessTypes =
  | Exclude<AccessType, "FilterOnly">
  | "DefaultAccess";

export type AnyOptionalTerm = OptionalTerm<
  unknown,
  OptionalAccessTypes,
  SourceType
>;

export class OptionalTerm<
  T,
  A extends OptionalAccessTypes,
  S extends SourceType,
> implements Term<T, DefaultAccessTypeApplied<A>, S> {
  _optionalBrand: undefined = undefined;

  datatypePlaceholder: DatatypePlaceholder<T> = {};
  data: TermCore<T, A, S>;

  constructor(t: TermCore<T, A, S>) {
    // @ts-expect-error // I want a runtime test here as well
    if (t.accessor === "FilterOnly")
      throw new Error("optional terms cannot be filters");

    this.data = t;
  }

  access<A extends OptionalAccessTypes>(access: A): OptionalTerm<T, A, S> {
    return new OptionalTerm(this.data.access(access));
  }

  readWrite() {
    return this.access("ReadWrite");
  }
  readOnly() {
    return this.access("ReadOnly");
  }
  writeOnly() {
    return this.access("WriteOnly");
  }
  noAccess() {
    return this.access("NoAccess");
  }
  defaultAccess() {
    return this.access("DefaultAccess");
  }

  source(s: "$this"): OptionalTerm<T, A, "this">;
  source(s: TermSourceIn): OptionalTerm<T, A, "other">;
  source(s: TermSourceIn) {
    return new OptionalTerm(this.data.source(s)) as
      | OptionalTerm<T, A, "this">
      | OptionalTerm<T, A, "other">;
  }

  _getBackendTerm(backend: Backend) {
    return backend.optionalQueryTerm(this.data.getBasicQueryTerm(backend));
  }

  _getSourceType() {
    return this.data.sourceType;
  }

  _getAccessorType() {
    return applyDefaultAccessType(this.data.accessor);
  }

  _getVariableWriteStrategy(): VariableUseStyle {
    return "MaybeWrites";
  }

  _usesVariables(): Set<string> {
    return this.data.getUsedVariables();
  }
}

export function isOptionalTerm(x: unknown): x is AnyOptionalTerm {
  return x instanceof OptionalTerm;
}

type DefaultAccessTypeApplied<A extends OptionalAccessTypes> =
  A extends "DefaultAccess" ? "ReadOnly" : A;

function applyDefaultAccessType<A extends OptionalAccessTypes>(
  a: A,
): DefaultAccessTypeApplied<A> {
  if (a === "DefaultAccess") {
    return "ReadOnly" as DefaultAccessTypeApplied<A>;
  }
  return a as DefaultAccessTypeApplied<A>;
}
