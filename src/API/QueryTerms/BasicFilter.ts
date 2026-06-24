import * as Backend from "#/Backend";

import { TermSourceIn } from "../BasicTypes";
import {
  DatatypePlaceholder,
  SourceType,
  Term,
  VariableWriteStyle as VariableUseStyle,
} from "../Query/makeQuery";
import { TermCore } from "./TermCore";

export class BasicFilter<S extends SourceType> implements Term<
  unknown,
  "FilterOnly",
  S
> {
  _basicFilterBrand12: undefined = undefined;

  datatypePlaceholder: DatatypePlaceholder<unknown> = {};
  data: TermCore<unknown, "FilterOnly", S>;

  constructor(data: TermCore<unknown, "FilterOnly", S>) {
    this.data = data;
  }

  source(s: "$this"): BasicFilter<"this">;
  source(s: TermSourceIn): BasicFilter<"other">;
  source(s: TermSourceIn) {
    return new BasicFilter(this.data.source(s)) as
      | BasicFilter<"this">
      | BasicFilter<"other">;
  }

  _getBackendTerm(backend: Backend.Backend) {
    return this.data.getBasicQueryTerm(backend);
  }

  _getSourceType() {
    return this.data.sourceType;
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

export type AnyBasicFilter = BasicFilter<"this" | "other">;

export function isBasicFilter(x: unknown): x is AnyBasicFilter {
  return x instanceof BasicFilter;
}
