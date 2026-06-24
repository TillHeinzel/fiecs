import * as Backend from "#/Backend";

import {
  isImplicitPair,
  isVariable,
  mapSourceStringInput,
  QueryTermBase,
  TermSource,
  TermSourceIn,
} from "../BasicTypes";
import {
  mapQueryTermInputToBackend,
  mapSourceToBackend,
} from "../mapWithBackend";
import { DatatypePlaceholder } from "../Query/makeQuery";
import { BasicFieldAccessType } from "./BasicField";

export class TermCore<T, A, S> {
  datatypePlaceholder: DatatypePlaceholder<T> = {};
  term: QueryTermBase;

  accessor: A;

  _source: TermSource;
  sourceType: S;

  constructor(
    t: QueryTermBase,
    accessor: A,
    source: TermSource,
    sourceType: S,
  ) {
    this.term = t;
    this._source = source;
    this.accessor = accessor;
    this.sourceType = sourceType;
  }

  access<A extends BasicFieldAccessType>(access: A): TermCore<T, A, S> {
    return new TermCore(this.term, access, this._source, this.sourceType);
  }

  source(s: "$this"): TermCore<T, A, "this">;
  source(s: TermSourceIn): TermCore<T, A, "other">;
  source(s: TermSourceIn): TermCore<T, A, "this"> | TermCore<T, A, "other"> {
    const source = mapSourceStringInput(s);

    return new TermCore(
      this.term,
      this.accessor,
      source,
      isVariable(source) && source.varName === "this" ? "this" : "other",
    ) as TermCore<T, A, "this"> | TermCore<T, A, "other">;
  }

  getUsedVariables(): Set<string> {
    return getVariables(this.term).union(getVariables(this._source));
  }

  getBasicQueryTerm(backend: Backend.Backend) {
    return backend.basicQueryTerm(
      mapQueryTermInputToBackend(this.term, backend),
      this.accessor !== "FilterOnly",
      mapSourceToBackend(this._source, backend),
    );
  }
}

export function getVariables(t: unknown): Set<string> {
  if (isVariable(t)) return new Set([t.varName]);
  if (isImplicitPair(t)) return getVariables(t[0]).union(getVariables(t[1]));
  return new Set();
}
