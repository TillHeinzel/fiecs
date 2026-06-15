import * as Backend from "#/Backend";

import {
  Component,
  ComponentDataSchema,
  Entity,
  PairComponent,
  PairTag,
  Tag,
} from "./Ids";
import { mapIdFromBackend } from "./mapWithBackend";
import { Wildcard } from "./Wildcard";

export class Query<T extends QueryT> {
  private query: Backend.Query;
  private backend: Backend.Backend;

  constructor(query: Backend.Query, backend: Backend.Backend) {
    this.backend = backend;
    this.query = query;
  }

  matches() {
    return this.query
      .archetypeWithMatches()
      .entries()
      .flatMap(([archetype, matches]) =>
        matches.map((match) => [archetype, match] as const),
      )
      .flatMap(([archetype, match]) =>
        archetype.entities.keys().map((entity) => ({
          entity: new Entity(entity, this.backend),
          match: match.map((m) =>
            mapIdFromBackend(m, this.backend),
          ) as MatchType<T>,
        })),
      );
  }
}
export type QueryT =
  | Tag
  | Component<ComponentDataSchema>
  | PairTag
  | PairComponent<ComponentDataSchema>
  | And<unknown[]>
  | Or<unknown[]>
  | Wildcard;
// prettier-ignore
type MatchType<T> = T extends Tag ? Boxed<T> : T extends Component<ComponentDataSchema> ? Boxed<T> : T extends PairTag ? Boxed<T> : T extends PairComponent<ComponentDataSchema> ? Boxed<T> : T extends And<infer Ts> ? Flatten<{
  [K in keyof Ts]: MatchType<Ts[K]>;
}> : T extends Or<infer Ts> ? Boxed<{
  [K in keyof Ts]: MatchType<Ts[K]>;
}[number]> : T extends Wildcard ? [unknown] : never;
type Boxed<T> = T extends unknown[] ? T : [T];
type Flatten<T> = T extends []
  ? []
  : T extends [infer T0]
    ? [...Flatten<T0>]
    : T extends [infer T0, ...infer Ts]
      ? [...Flatten<T0>, ...Flatten<Ts>]
      : [T];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class And<Ts extends unknown[]> {
  _andBrand: undefined = undefined;

  data: Backend.And;

  constructor(data: Backend.And) {
    this.data = data;
  }
}

export function and<Ts extends QueryT[]>(...subs: Ts): And<Ts> {
  return new And(Backend.and(...subs.map((c) => c.data)));
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Or<Ts extends unknown[]> {
  _orBrand: undefined = undefined;

  data: Backend.Or;

  constructor(data: Backend.Or) {
    this.data = data;
  }
}

export function or<Ts extends QueryT[]>(...subs: Ts): Or<Ts> {
  return new Or(Backend.or(...subs.map((c) => c.data)));
}
