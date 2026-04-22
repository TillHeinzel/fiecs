import { Archetype, Entity, Pair } from "./BasicObjects";
import * as ComponentIndex from "./ComponentIndex";

export const isWildcard = ComponentIndex.isWildcard<Archetype, Entity, Pair>;
export const isDoubleWildcard = ComponentIndex.isWildcardWildcard<
  Archetype,
  Entity,
  Pair
>;
export const isRelationshipWildcard = ComponentIndex.isRelationshipWildcard<
  Archetype,
  Entity,
  Pair
>;
export const isWildcardTarget = ComponentIndex.isWildcardTarget<
  Archetype,
  Entity,
  Pair
>;

export type Wildcard = ComponentIndex.Wildcard<Archetype, Entity, Pair>;

export type DoubleWildcard = ComponentIndex.WildcardWildcard<
  Archetype,
  Entity,
  Pair
>;
export type RelationshipWildcard = ComponentIndex.RelationshipWildcard<
  Archetype,
  Entity,
  Pair
>;
export type WildcardTarget = ComponentIndex.WildcardTarget<
  Archetype,
  Entity,
  Pair
>;

export interface IQueryAble<T> {
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<T>;
  matchingArchetypes(): IteratorObject<Archetype>;
}

export type Query = {
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): Set<Entity | Pair>;
  matchingArchetypes(): IteratorObject<Archetype>;
  archetypesWithMatches(): IteratorObject<[Archetype, Set<Entity | Pair>]>;
  archetypeWithMatches(): Map<Archetype, Array<Array<Entity | Pair>>>;
};

export class QueryBuilder {
  componentIndex: ComponentIndex.ComponentIndex<Archetype, Entity, Pair>;

  constructor(
    componentIndex: ComponentIndex.ComponentIndex<Archetype, Entity, Pair>,
  ) {
    this.componentIndex = componentIndex;
  }

  build(arg: QueryT): Query {
    return new QueryImpl(this.buildBit(arg));
  }

  private buildBit(arg: QueryT): QueryBit {
    if (isAnd(arg)) {
      return new AndQuery(arg.ands.map((term) => this.buildBit(term)));
    }
    if (isOr(arg)) {
      return new OrQuery(arg.ors.map((term) => this.buildBit(term)));
    }
    return new SingleQueryTerm(arg);
  }
}

export type QueryT = SingleTerm | And | Or;

export class And {
  _andBrand: undefined = undefined;
  ands: QueryT[];

  constructor(ands: QueryT[]) {
    this.ands = ands;
  }
}

function isAnd(value: unknown): value is And {
  return value instanceof And;
}

export function and(...ands: QueryT[]): And {
  return new And(ands);
}

export class Or {
  _orBrand: undefined = undefined;
  ors: QueryT[];

  constructor(ors: QueryT[]) {
    this.ors = ors;
  }
}

function isOr(value: unknown): value is Or {
  return value instanceof Or;
}

export function or(...ors: QueryT[]): Or {
  return new Or(ors);
}

class QueryImpl implements Query {
  private queryBit: QueryBit;

  constructor(queryBit: QueryBit) {
    this.queryBit = queryBit;
  }

  matchingArchetypes(): IteratorObject<Archetype> {
    return this.queryBit.matchingArchetypes();
  }
  matches(archetype: Archetype): boolean {
    return this.queryBit.matches(archetype);
  }
  match(archetype: Archetype): Set<Entity | Pair> {
    return this.queryBit.match(archetype);
  }

  archetypesWithMatches(): IteratorObject<[Archetype, Set<Entity | Pair>]> {
    return this.queryBit
      .matchingArchetypes()
      .map((archetype) => [archetype, this.queryBit.match(archetype)]);
  }

  archetypeWithMatches(): Map<Archetype, Array<Array<Entity | Pair>>> {
    return this.queryBit.archetypesWithMatch();
  }
}

export type SingleTerm =
  | Wildcard
  | Entity
  | Pair
  | DoubleWildcard
  | RelationshipWildcard
  | WildcardTarget;

type QueryBit = {
  matchingArchetypes(): IteratorObject<Archetype>;
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): Set<Entity | Pair>;
  // arrayOfMatches(archetype: Archetype): Array<Match>;
  archetypesWithMatch(): Map<Archetype, Array<Match>>;
};

class OrQuery implements QueryBit {
  private subqueries: QueryBit[];

  constructor(subqueries: QueryBit[]) {
    this.subqueries = subqueries;
  }

  matchingArchetypes(): IteratorObject<Archetype> {
    return this.subqueries
      .reduce(
        (set, query) => set.union(new Set(query.matchingArchetypes())),
        new Set<Archetype>(),
      )
      .values();
  }

  matches(archetype: Archetype): boolean {
    throw new Error("OrQuery is not fully implemented yet");
    return this.subqueries.some((query) => query.matches(archetype));
  }

  match(archetype: Archetype): Set<Entity | Pair> {
    return this.subqueries.reduce(
      (set, query) => set.union(query.match(archetype)),
      new Set<Entity | Pair>(),
    );
  }

  archetypesWithMatch(): Map<Archetype, Array<Match>> {
    const retval = new Map<Archetype, Array<Match>>();

    for (const query of this.subqueries) {
      for (const [archetype, matches] of query.archetypesWithMatch()) {
        const existing = retval.get(archetype) ?? [];
        existing.push(...matches);
        retval.set(archetype, existing);
      }
    }
    return retval;
  }
}

type Match = Array<Entity | Pair>;

class AndQuery implements QueryBit {
  private subqueries: QueryBit[];

  constructor(subqueries: QueryBit[]) {
    this.subqueries = subqueries;
  }

  matchingArchetypes(): IteratorObject<Archetype> {
    const elements = [...this.subqueries];
    const first = elements.shift();
    return elements
      .reduce(
        (set, query) => set.intersection(new Set(query.matchingArchetypes())),
        new Set<Archetype>(first!.matchingArchetypes()),
      )
      .values();
  }

  matches(archetype: Archetype): boolean {
    throw new Error("AndQuery is not fully implemented yet");
    return this.subqueries.every((query) => query.matches(archetype));
  }

  match(archetype: Archetype): Set<Entity | Pair> {
    const elements = [...this.subqueries];
    const first = elements.shift();
    return elements.reduce(
      (set, query) => set.intersection(query.match(archetype)),
      first!.match(archetype),
    );
  }

  archetypesWithMatch(): Map<Archetype, Array<Match>> {
    const matchingArchetypes = this.matchingArchetypes();

    const retval = new Map<Archetype, Array<Match>>();

    const subArchetypesWithMatches = this.subqueries.map((query) =>
      query.archetypesWithMatch(),
    );

    for (const archetype of matchingArchetypes) {
      const matches = subArchetypesWithMatches.map(
        (query) => query.get(archetype) ?? [],
      );
      const combinations = cartesian(
        ...matches.map((match) => Array.from(match)),
      ).map((combination) => combination.flat());
      retval.set(archetype, combinations);
    }
    return retval;
  }
}

class SingleQueryTerm implements QueryBit {
  term: IQueryAble<Entity | Pair>;

  constructor(id: IQueryAble<Entity | Pair>) {
    this.term = id;
  }

  matchingArchetypes(): IteratorObject<Archetype> {
    return this.term.matchingArchetypes();
  }

  matches(archetype: Archetype): boolean {
    return this.term.matches(archetype);
  }

  match(archetype: Archetype): Set<Entity | Pair> {
    return new Set(this.term.match(archetype));
  }

  archetypesWithMatch(): Map<Archetype, Array<Match>> {
    return new Map(
      this.term
        .matchingArchetypes()
        .map((archetype) => [
          archetype,
          Array.from(this.term.match(archetype).map((match) => [match])),
        ]),
    );
  }
}

function cartesian<T>(...arrays: Array<Array<T>>): Array<Array<T>> {
  return arrays.reduce(
    (acc, curr) =>
      acc
        .map((x) => curr.map((y) => x.concat([y])))
        .reduce((a, b) => a.concat(b), []),
    [[]] as Array<Array<T>>,
  );
}
