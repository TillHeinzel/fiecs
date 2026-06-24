import * as Backend from "#/Backend";
import { ImmutableMap } from "#/Utility/ImmutableMap";

import { Entity, VariableString } from "../BasicTypes";
import { mapIdFromBackend } from "../mapWithBackend";
import { Filter, SourceType, Term } from "./makeQuery";
import { AccessType, mapToAccessor } from "./MatchAccessors";

export class Query<Ts extends unknown[]> {
  terms: (Term<unknown, AccessType, SourceType> | Filter<SourceType>)[];
  cacheStrategy: Backend.CacheStrategy;
  backend: Backend.Backend;
  fixedVariables: ReadonlyMap<VariableString<string>, Entity>;

  backendQuery: Backend.Query;
  mapMatchToAccessors: (m: Backend.OutputMatch[]) => Ts;
  constructor(
    terms: Term<unknown, AccessType, SourceType>[],
    cacheStrategy: Backend.CacheStrategy,
    backend: Backend.Backend,
    fixedVariables: ReadonlyMap<VariableString<string>, Entity> = new Map(),
  ) {
    this.terms = terms;
    this.cacheStrategy = cacheStrategy;
    this.fixedVariables = fixedVariables;
    this.backend = backend;
    this.backendQuery = backend.query(
      terms.map((t) => t._getBackendTerm(backend)),
      cacheStrategy,
      new ImmutableMap(
        fixedVariables.entries().map(([v, e]) => [v.slice(1), e.data]),
      ),
    );

    const accessors = terms
      .map((t) => mapToAccessor(t._getAccessorType()))
      .filter((a) => a !== undefined);

    const prFieldMapping = accessors.map(
      (Accessor) => (m: Backend.OutputMatch) =>
        new Accessor(
          m.component === undefined
            ? undefined
            : mapIdFromBackend(m.component, backend),
          new Entity(m.source, backend),
        ),
    );

    this.mapMatchToAccessors = (match: Backend.OutputMatch[]) =>
      prFieldMapping.map((mapper, i) => mapper(match[i])) as Ts;
  }

  each(callback: (...ts: Ts) => void) {
    this.backend.lockedRun(() => {
      this.backendQuery
        .matchesIterator()
        .forEach(({ match }) => callback(...this.mapMatchToAccessors(match)));
    });
  }

  _trackedEach(
    callback: (...ts: Ts) => void,
    tracker: (o: Backend.GetMatchOutcome) => void,
  ) {
    this.backend.lockedRun(() => {
      this.backendQuery
        .matchesIterator(tracker)
        .forEach(({ match }) => callback(...this.mapMatchToAccessors(match)));
    });
  }

  getIterator(): IteratorObject<Ts> {
    return this.backendQuery
      .matchesIterator()
      .map(({ match }) => this.mapMatchToAccessors(match));
  }

  getIteratorWithVariables(): IteratorObject<{
    match: Ts;
    variables: ReadonlyMap<string, Entity>;
  }> {
    return this.backendQuery.matchesIterator().map(({ variables, match }) => ({
      match: this.mapMatchToAccessors(match),
      variables: new Map(
        variables.entries().map(([k, v]) => [k, new Entity(v, this.backend)]),
      ),
    }));
  }

  getVariables() {
    return this.fixedVariables;
  }

  setVariables(variables: [VariableString<string>, Entity][]): this {
    const ctor = this.constructor;

    // @ts-expect-error so yeah, not sure how to make this friendlier for typescript
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return new ctor(
      this.terms,
      this.cacheStrategy,
      this.backend,
      new Map([...this.fixedVariables, ...variables]),
    );
  }
}

export class QueryWithEntityAccess<Ts extends unknown[]> extends Query<Ts> {
  eachWithEntity(callback: (e: Entity, ...ts: Ts) => void) {
    this.backend.lockedRun(() => {
      this.backendQuery
        .matchesIterator()
        .forEach(({ variables, match }) =>
          callback(
            new Entity(variables.get("this")!, this.backend),
            ...this.mapMatchToAccessors(match),
          ),
        );
    });
  }

  getIteratorWithEntity(): IteratorObject<{ match: Ts; entity: Entity }> {
    return this.backendQuery.matchesIterator().map(({ variables, match }) => ({
      entity: new Entity(variables.get("this")!, this.backend),
      match: this.mapMatchToAccessors(match),
    }));
  }
}
