import { Archetype, Entity, Pair } from "../BasicTypes/BasicObjects";

export class SimpleQuery {
  terms: ReadonlySet<Entity | Pair>;

  constructor(terms: ReadonlySet<Entity | Pair>) {
    this.terms = terms;
  }

  matchingArchetypes(): IteratorObject<Archetype> {
    if (this.terms.size === 0) return [].values();

    const [first, ...otherFilters] = this.terms;

    return first.matchingArchetypes().filter((archetype) => {
      for (const term of otherFilters) {
        if (!term.matches(archetype)) return false;
      }
      return true;
    });
  }
}
