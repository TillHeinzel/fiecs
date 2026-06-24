import { Backend } from "#/Backend";

import { TermSourceIn } from "../BasicTypes";
import {
  DatatypePlaceholder,
  SourceType,
  Term,
  VariableUseStyle,
} from "../Query";
import { TermCore } from "./TermCore";

export class NotTerm<S extends SourceType> implements Term<
  undefined,
  "FilterOnly",
  S
> {
  _notTermBrand: undefined = undefined;

  datatypePlaceholder: DatatypePlaceholder<undefined> = {};

  data: TermCore<unknown, "FilterOnly", S>;

  constructor(data: TermCore<unknown, "FilterOnly", S>) {
    this.data = data;
  }

  source(s: "$this"): NotTerm<"this">;
  source(s: TermSourceIn): NotTerm<"other">;
  source(s: TermSourceIn) {
    return new NotTerm(this.data.source(s)) as
      | NotTerm<"this">
      | NotTerm<"other">;
  }

  _getSourceType() {
    return this.data.sourceType;
  }

  _getBackendTerm(backend: Backend) {
    return backend.notQueryTerm(this.data.getBasicQueryTerm(backend));
  }

  _getAccessorType() {
    return "FilterOnly" as const;
  }

  _getVariableWriteStrategy(): VariableUseStyle {
    return "DefinitelyWrites";
  }

  _usesVariables(): Set<string> {
    return this.data.getUsedVariables();
  }
}

export type AnyNotTerm = NotTerm<SourceType>;

export function isNotTerm(x: unknown): x is AnyNotTerm {
  return x instanceof NotTerm;
}
