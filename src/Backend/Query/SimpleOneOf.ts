import {
  Archetype,
  DoubleWildcard,
  Entity,
  Pair,
  RelationshipWildcard,
  Wildcard,
  WildcardTarget,
} from "../BasicTypes/BasicObjects";
import { isStringlookup, StringLookup } from "../BasicTypes/StringLookup";

export class SimpleOneOf {
  _oneOfBrand: undefined = undefined;

  options: (
    | Entity
    | Pair
    | Wildcard
    | DoubleWildcard
    | WildcardTarget
    | RelationshipWildcard
    | StringLookup
  )[];

  constructor(
    options: (
      | Entity
      | Pair
      | Wildcard
      | DoubleWildcard
      | WildcardTarget
      | RelationshipWildcard
      | StringLookup
    )[],
  ) {
    this.options = options;
  }

  archetypesWithMatches(): Map<Archetype, Set<Entity | Pair>> {
    const opts = this.options.map((o) =>
      isStringlookup(o) ? o.doLookup() : o,
    );

    if (opts.some((o) => o === undefined)) return new Map();

    return opts
      .map((o) => o!.archetypesWithMatches())
      .reduce((prev, current) => {
        current.forEach((match, archetype) => {
          prev.set(archetype, (prev.get(archetype) ?? new Set()).union(match));
        });
        return prev;
      }, new Map<Archetype, Set<Entity | Pair>>());
  }
}
