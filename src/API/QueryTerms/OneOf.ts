import * as Backend from "#/Backend";

import {
  AccessType,
  DatatypePlaceholder,
  SourceType,
  Term,
  VariableUseStyle,
} from "../Query";
import { AnyBasicField } from "./BasicField";
import { AnyBasicFilter } from "./BasicFilter";

export type AnyOneOfTerm = OneOfTerm<OneOfInput[]>;

export type OneOfInput = AnyBasicField | AnyBasicFilter;

export class OneOfTerm<Ts extends OneOfInput[]> implements Term<
  GetDataType<Ts>,
  GetAccessType<Ts>,
  GetSourceType<Ts>
> {
  _oneOfTermBrand99_: undefined = undefined;

  datatypePlaceholder: DatatypePlaceholder<GetDataType<Ts>> = {};
  sourceType: GetSourceType<Ts>;

  terms: Ts;
  accessType: GetAccessType<Ts>;

  constructor(ts: Ts) {
    this.accessType = checkAllSameAccessType(ts) as GetAccessType<Ts>;

    this.terms = ts;
    this.sourceType = getSourceType(ts);
  }

  _getSourceType() {
    return this.sourceType;
  }

  _getAccessorType() {
    return this.accessType;
  }

  _getBackendTerm(backend: Backend.Backend): Backend.Term | Backend.OneOf {
    return backend.oneOfQueryTerm(
      this.terms.map((t) => t._getBackendTerm(backend)),
    );
  }

  _getVariableWriteStrategy(): VariableUseStyle {
    return "MaybeWrites";
  }

  _usesVariables(): Set<string> {
    return this.terms
      .map((t) => t._usesVariables())
      .reduce((prev, v) => prev.union(v));
  }
}

export function isOneOfTerm(x: unknown): x is AnyOneOfTerm {
  return x instanceof OneOfTerm;
}

type GetDataType<Ts extends OneOfInput[]> = {
  [Index in keyof Ts]: Ts[Index] extends Term<
    infer Type,
    AccessType,
    SourceType
  >
    ? Type
    : never;
}[number];

type GetAccessType<T extends OneOfInput[]> =
  T[0] extends Term<unknown, infer A, SourceType> ? A : never;

type GetSourceType<Ts extends OneOfInput[]> = GetSourceTypeHelper<
  GetSingleSourceType<Ts[0]>,
  {
    [Index in keyof Ts]: GetSingleSourceType<Ts[Index]>;
  }
>;

type GetSourceTypeHelper<
  S extends SourceType,
  Ss extends SourceType[],
> = Ss extends []
  ? S
  : S extends "mixed"
    ? S
    : Ss extends [
          infer Head extends SourceType,
          ...infer Tail extends SourceType[],
        ]
      ? GetSourceTypeHelper<PickSourceType<S, Head>, Tail>
      : never;

type PickSourceType<
  S1 extends SourceType,
  S2 extends SourceType,
> = S1 extends "this"
  ? S2 extends "this"
    ? "this"
    : "mixed"
  : S1 extends "other"
    ? S2 extends "other"
      ? "other"
      : "mixed"
    : "mixed";

type GetSingleSourceType<T extends OneOfInput> =
  T extends Term<unknown, AccessType, infer S> ? S : never;

function getSourceType<Ts extends OneOfInput[]>(ts: Ts): GetSourceType<Ts> {
  return ts
    .map((t) => t._getSourceType())
    .reduce((p, s) =>
      p === "this" && s === "this"
        ? "this"
        : p === "other" && s === "other"
          ? "other"
          : "mixed",
    ) as GetSourceType<Ts>;
}

function checkAllSameAccessType(ts: OneOfInput[]) {
  const as = ts.map((t) => t._getAccessorType());

  const aCheck = as[0];

  if (as.some((a) => a !== aCheck))
    throw new Error(
      `subterms of oneOf must all have the same access-type. Current: [${as.join(", ")}]`,
    );

  return aCheck;
}
