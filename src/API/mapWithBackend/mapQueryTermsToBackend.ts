import * as Backend from "#/Backend";

import {
  Component,
  Entity,
  isAnyPairIndex,
  isAnySingleIndex,
  isImplicitPair,
  isStringlookup,
  isVariable,
  QueryTermBase,
  StringLookup,
  TermSource,
  Variable,
  Wildcard,
} from "../BasicTypes";
import {
  mapIndexToBackend,
  mapSingleIndexToBackend,
} from "./mapSomeStuffWithBackend";

export function mapSourceToBackend(
  s: TermSource,
  backend: Backend.Backend,
): Backend.Entity | Backend.Variable | Backend.StringLookup {
  if (isStringlookup(s)) return new Backend.StringLookup(s.s, backend);
  if (isVariable(s)) return new Backend.Variable(s.varName, backend);

  return s.data;
}

export function mapQueryTermInputToBackend(
  term: QueryTermBase,
  backend: Backend.Backend,
): Backend.BasicTermInput {
  if (isAnyPairIndex(term)) {
    return mapIndexToBackend(term, backend);
  } else if (isImplicitPair(term)) {
    return [
      mapSingleQueryTermInputToBackend(term[0], backend),
      mapSingleQueryTermInputToBackend(term[1], backend),
    ] as Backend.BasicTermInput;
  } else {
    return mapSingleQueryTermInputToBackend(term, backend);
  }
  throw new Error("internal: something went wrong");
}

function mapSingleQueryTermInputToBackend(
  term: Entity | Wildcard | Component<unknown> | Variable | StringLookup,
  backend: Backend.Backend,
) {
  if (isVariable(term)) {
    return new Backend.Variable(term.varName, backend);
  } else if (isStringlookup(term)) {
    return new Backend.StringLookup(term.s, backend);
  } else if (isAnySingleIndex(term)) {
    return mapSingleIndexToBackend(term);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const x = term;
    throw new Error("not implemented: ");
  }
}
