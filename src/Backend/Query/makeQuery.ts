import { concatIterators } from "#/Utility/concatIterators";
import { ImmutableMap } from "#/Utility/ImmutableMap";

import { Archetype, Entity } from "../BasicTypes/BasicObjects";
import {
  BaseQuery,
  CacheStrategy,
  GetMatchOutcome,
  OutputMatch,
  Query,
  Term,
  VariableValue,
} from "./BaseQuery";

export function makeQuery(
  terms: (Term | OneOf)[],
  cacheStrategy: CacheStrategy,
  onArchetypeCreationCallback: (f: (a: Archetype) => void) => void,
  initialQueryVariables = new ImmutableMap<string, VariableValue>(),
): Query {
  return new SuperQuery(
    unpackOneOf(terms).map(
      (terms) =>
        new BaseQuery(
          terms,
          cacheStrategy,
          onArchetypeCreationCallback,
          initialQueryVariables,
        ),
    ),
  );
}

export function oneOf(terms: Term[]) {
  return new OneOf(terms);
}

function unpackOneOf(terms: (Term | OneOf)[]): Term[][] {
  return terms.reduce(
    (prev, t) =>
      isOneOf(t)
        ? prev.flatMap((ts) => t.terms.map((sub) => [...ts, sub]))
        : prev.map((ts) => [...ts, t]),
    [[]] as Term[][],
  );
}

export class OneOf {
  _backendOneOfBrand28: undefined = undefined;

  terms: Term[];

  constructor(terms: Term[]) {
    this.terms = terms;
  }
}

function isOneOf(x: unknown): x is OneOf {
  return x instanceof OneOf;
}

class SuperQuery implements Query {
  subQueries: Query[];

  constructor(subQueries: Query[]) {
    this.subQueries = subQueries;
  }

  matchesIterator(
    tracker?: (outcome: GetMatchOutcome) => void,
  ): IteratorObject<{
    match: OutputMatch[];
    variables: ImmutableMap<string, Entity>;
  }> {
    return concatIterators(
      ...this.subQueries.map((q) => q.matchesIterator(tracker)),
    );
  }
}
