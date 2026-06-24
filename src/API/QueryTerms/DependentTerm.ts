import * as Backend from "#/Backend";

import { DatatypePlaceholder, Term, VariableUseStyle } from "../Query";
import { TermCore } from "./TermCore";

export type AnyDependentTerm = DependentTerm<unknown>;

export class DependentTerm<T> implements Term<T, "ReadWrite", "this"> {
  _depententTermBrand20_: undefined = undefined;

  datatypePlaceholder: DatatypePlaceholder<T> = {};

  data: TermCore<T, "ReadWrite", "this">;

  constructor(t: TermCore<T, "ReadWrite", "this">) {
    this.data = t;
  }

  _getAccessorType() {
    return "ReadWrite" as const;
  }
  _getSourceType() {
    return "this" as const;
  }

  _getBackendTerm(backend: Backend.Backend): Backend.Term {
    return backend.optionalQueryTerm(this.data.getBasicQueryTerm(backend));
  }

  _getVariableWriteStrategy(): VariableUseStyle {
    return "NoWrite_IgnoresUnset";
  }
  _usesVariables(): Set<string> {
    return this.data.getUsedVariables();
  }
}

export function isDependentTerm(x: unknown): x is AnyDependentTerm {
  return x instanceof DependentTerm;
}
