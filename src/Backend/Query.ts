import { Archetype } from "./Core/Archetype";
import { Entity, isPair } from "./Core/EntityData";

export type Query = {
  forEachArchetype(callback: (archetype: Archetype) => void): void;
  matches(archetype: Archetype): boolean;
};

class WildcardClass {
  _dummyWildcardClass!: never; // This is just to make sure this class has a runtime representation, it has no actual functionality
}

export const wildcard = new WildcardClass();

export function makeQuery(component: Entity): Query;
export function makeQuery(pair: [Entity, WildcardClass]): Query;
export function makeQuery(arg: Entity | [Entity, WildcardClass]): Query {
  if (Array.isArray(arg) && arg.length === 2 && arg[1] === wildcard) {
    return new WildcardQuery(arg[0]);
  }
  if (arg instanceof Entity) {
    return new SingleComponentQuery(arg);
  }

  throw new Error("Invalid query argument");
}

class SingleComponentQuery implements Query {
  component: Entity;

  constructor(component: Entity) {
    this.component = component;
  }

  forEachArchetype(callback: (archetype: Archetype) => void): void {
    for (const archetype of this.component.backLinksComponent ?? []) {
      callback(archetype);
    }
  }

  matches(archetype: Archetype): boolean {
    return archetype.components.has(this.component);
  }
}

class WildcardQuery implements Query {
  relationship: Entity;

  constructor(relationship: Entity) {
    this.relationship = relationship;
  }

  forEachArchetype(callback: (archetype: Archetype) => void): void {
    this.relationship.backLinksType
      ?.entries()
      .flatMap(([, pair]) => pair.backLinksComponent?.keys() ?? [])
      .forEach(callback);
  }

  matches(archetype: Archetype): boolean {
    return archetype.components
      .keys()
      .filter((component) => isPair(component))
      .some((pair) => pair.type === this.relationship);
  }
}
