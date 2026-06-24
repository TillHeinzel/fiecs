import { ImmutableMap } from "#/Utility/ImmutableMap";

import { Archetype, Entity, isEntity, Pair } from "../BasicTypes/BasicObjects";

export type CacheStrategy =
  | "noCache"
  | "cacheAsMuchAsPossible"
  | "requireCaching";

export type Query = {
  matchesIterator(
    tracker?: (outcome: GetMatchOutcome) => void,
  ): IteratorObject<{
    match: OutputMatch[];
    variables: ImmutableMap<string, Entity>;
  }>;
};

export class BaseQuery implements Query {
  cachedTerms: Term[];
  uncachedTerms: Term[];
  cache: (readonly [QueryVariables, FullMatch])[];

  constructor(
    terms: Term[],
    cacheStrategy: CacheStrategy,
    onArchetypeCreationCallback: (f: (a: Archetype) => void) => void,
    initialQueryVariables: QueryVariables,
  ) {
    switch (cacheStrategy) {
      case "noCache":
        this.cachedTerms = [];
        this.uncachedTerms = terms;
        break;
      case "cacheAsMuchAsPossible":
        this.uncachedTerms = terms.splice(firstNonCacheableIndex(terms));
        this.cachedTerms = terms;
        break;
      case "requireCaching":
        if (terms.some((t) => !t.cacheAble)) throw new Error("cannot cache");
        this.cachedTerms = terms;
        this.uncachedTerms = [];
        break;
    }

    this.cache = Array.from(
      buildBacktrackingMatchesIterator(
        this.cachedTerms,
        [[initialQueryVariables, new Array<Match>()] as const].values(),
      ),
    );

    if (this.cachedTerms.length !== 0) {
      onArchetypeCreationCallback((a) => {
        this.cache = this.cache.concat(
          Array.from(
            buildBacktrackingMatchesIterator(
              this.cachedTerms,
              [
                [
                  newQueryVariables().set("this", a),
                  new Array<Match>(),
                ] as const,
              ].values(),
            ),
          ),
        );
      });
    }
  }

  matchesIterator(
    tracker: (outcome: GetMatchOutcome) => void = () => {},
  ): IteratorObject<{
    match: OutputMatch[];
    variables: ImmutableMap<string, Entity>;
  }> {
    return buildBacktrackingMatchesIterator(
      this.uncachedTerms,
      this.cache.values(),
      tracker,
    ).flatMap(([variables, match]) => {
      return collapseToEntityOnly(variables).map((vars) => ({
        match: match.map(({ component, source }) => ({
          source: ensureSource(source, vars),
          component,
        })),
        variables: vars,
      }));
    });
  }
}

export type OutputMatch = {
  component: Entity | Pair | undefined;
  source: Entity;
};

function firstNonCacheableIndex(terms: Term[]) {
  const i = terms.findIndex((t) => !t.cacheAble);

  if (i >= 0) return i;
  return Infinity;
}

type queryIterator = IteratorObject<readonly [QueryVariables, FullMatch]>;

function buildBacktrackingMatchesIterator(
  terms: Term[],
  init: queryIterator,
  tracker: (outcome: GetMatchOutcome) => void = () => {},
) {
  return terms
    .map((t) => makeGetMatch(t, tracker))
    .reduce(
      (prev, getMatch) =>
        prev.flatMap(([variables, matchSoFar]) => {
          return getMatch(variables, matchSoFar);
        }),
      init,
    );
}

function makeGetMatch(
  term: Term,
  tracker: (o: GetMatchOutcome) => void = () => {},
) {
  const tryGetMatch = term.lookupStrings();

  const getMatch = (
    variables: QueryVariables,
    matchSoFar: FullMatch,
  ): queryIterator => {
    const getMatchOutcome = tryGetMatch(variables);

    tracker(getMatchOutcome);

    switch (getMatchOutcome.result) {
      case "successfulField":
        return getMatchOutcome.matches.map((component) => {
          return [
            variables,
            [
              ...matchSoFar,
              {
                component,
                source: getMatchOutcome.source,
              },
            ],
          ] as const;
        });

      case "failedField":
        return [].values();

      case "successfulFilter":
        return [[variables, matchSoFar] as const].values();

      case "failedFilter":
        return [].values();

      case "missingVariable":
        return getMatchOutcome.candidates.flatMap((candidate) =>
          getMatch(
            variables.set(getMatchOutcome.varName, candidate),
            matchSoFar,
          ),
        );

      case "missingSourceVariable":
        return getMatchOutcome.candidates.flatMap((candidate) =>
          getMatch(
            variables.set(getMatchOutcome.varName, candidate),
            matchSoFar,
          ),
        );

      case "needVariableAsEntity":
        return (variables.get(getMatchOutcome.varName)! as Archetype).entities
          .keys()
          .flatMap((e) =>
            getMatch(variables.set(getMatchOutcome.varName, e), matchSoFar),
          );

      default:
        throw new Error("Internal: something has gone terribly wrong");
    }
  };

  return getMatch;
}

function ensureSource(
  source: string | Entity,
  vars: ImmutableMap<string, Entity>,
): Entity {
  if (isEntity(source)) return source;

  const res = vars.get(source);
  if (res === undefined)
    throw new Error("internal: missing source variable? somehow?");

  return res;
}

export type Match = {
  component: Entity | Pair | undefined;
  source: string | Entity;
};
export type FullMatch = Match[];

export type SuccessfulFieldMessage = {
  result: "successfulField";
  matches: IteratorObject<Entity | Pair | undefined>;
  source: string | Entity;
};

export type FailedFieldMessage = {
  result: "failedField";
  source: string | Entity;
};

export type SuccessfulFilterMessage = { result: "successfulFilter" };
export type FailedFilterMessage = { result: "failedFilter" };

export type MissingVariableMessage = {
  result: "missingVariable";
  varName: string;
  candidates: IteratorObject<Archetype> | IteratorObject<Entity>;
};
export type MissingSourceVariableMessage = {
  result: "missingSourceVariable";
  varName: string;
  candidates: IteratorObject<Archetype>;
};
export type NeedVariableAsEntityMessage = {
  result: "needVariableAsEntity";
  varName: string;
};

export type GetMatchOutcome =
  | SuccessfulFieldMessage
  | SuccessfulFilterMessage
  | FailedFilterMessage
  | MissingVariableMessage
  | MissingSourceVariableMessage
  | NeedVariableAsEntityMessage
  | FailedFieldMessage;

export type Term = {
  lookupStrings: () => (a: QueryVariables) => GetMatchOutcome;

  cacheAble: boolean;
};

export type VariableValue = Entity | Archetype;

export type QueryVariables = ImmutableMap<string, VariableValue>;

export function newQueryVariables(): QueryVariables {
  return new ImmutableMap<string, VariableValue>();
}

function collapseToEntityOnly(
  vars: QueryVariables,
): IteratorObject<ImmutableMap<string, Entity>> {
  const init = [new ImmutableMap<string, Entity>()].values() as IteratorObject<
    ImmutableMap<string, Entity>
  >;

  return vars.entries().reduce(
    (prev, [varName, value]) =>
      prev.flatMap((variablesSoFar) => {
        if (isEntity(value)) return [variablesSoFar.set(varName, value)];

        return value.entities.keys().map((e) => variablesSoFar.set(varName, e));
      }),
    init,
  );
}
