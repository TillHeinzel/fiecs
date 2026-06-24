import * as Backend from "#/Backend";

import { TermSourceIn } from "../BasicTypes";
import {
  AccessType,
  DatatypePlaceholder,
  SourceType,
  Term,
  VariableUseStyle,
} from "../Query";
import { TermCore } from "./TermCore";

export type BasicFieldAccessType =
  | Exclude<AccessType, "FilterOnly">
  | "DefaultAccess";

export type AnyBasicField = BasicField<
  unknown,
  BasicFieldAccessType,
  SourceType
>;

export class BasicField<
  T,
  A extends BasicFieldAccessType,
  S extends SourceType,
> implements Term<T, DefaultAccessTypeApplied<A, S>, S> {
  _basicTermBrand49: undefined = undefined;

  datatypePlaceholder: DatatypePlaceholder<T> = {};
  data: TermCore<T, A, S>;

  constructor(data: TermCore<T, A, S>) {
    this.data = data;
  }

  access<A extends BasicFieldAccessType>(a: A): BasicField<T, A, S> {
    return new BasicField(this.data.access(a));
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

  source(s: "$this"): BasicField<T, A, "this">;
  source(s: TermSourceIn): BasicField<T, A, "other">;
  source(s: TermSourceIn) {
    return new BasicField(this.data.source(s)) as
      | BasicField<T, A, "this">
      | BasicField<T, A, "other">;
  }

  _getBackendTerm(backend: Backend.Backend) {
    return this.data.getBasicQueryTerm(backend);
  }

  _getSourceType() {
    return this.data.sourceType;
  }

  _getAccessorType() {
    return applyDefaultAccessType(this.data.accessor, this.data.sourceType);
  }

  _getVariableWriteStrategy(): VariableUseStyle {
    return "DefinitelyWrites";
  }

  _usesVariables(): Set<string> {
    return this.data.getUsedVariables();
  }
}

export function isBasicTerm(x: unknown): x is AnyBasicField {
  return x instanceof BasicField;
}

type DefaultAccessTypeApplied<
  A extends BasicFieldAccessType,
  S extends SourceType,
> = A extends "DefaultAccess"
  ? S extends "this"
    ? "ReadWrite"
    : "ReadOnly"
  : A;

function applyDefaultAccessType<
  A extends BasicFieldAccessType,
  S extends SourceType,
>(a: A, s: S): DefaultAccessTypeApplied<A, S> {
  if (a === "DefaultAccess") {
    if (s === "this") {
      return "ReadWrite" as DefaultAccessTypeApplied<A, S>;
    }
    return "ReadOnly" as DefaultAccessTypeApplied<A, S>;
  }
  return a as DefaultAccessTypeApplied<A, S>;
}
