import { Archetype } from "./Core/Archetype";
import { Entity, Id, isPair, Pair } from "./Core/EntityData";

export type Query = {
  forEachArchetype(callback: (archetype: Archetype) => void): void;
  matches(archetype: Archetype): boolean;
  each(callback: (entity: Entity) => void): void;
};

class WildcardClass {
  _dummyWildcardClass!: never; // This is just to make sure this class has a runtime representation, it has no actual functionality
}

export const wildcard = new WildcardClass();

export function makeQuery(id: Id): Query;
export function makeQuery(pair: [Entity, WildcardClass]): Query;
export function makeQuery(arg: Id | [Entity, WildcardClass]): Query {
  if (Array.isArray(arg) && arg.length === 2 && arg[1] === wildcard) {
    return new WildcardQuery(arg[0]);
  }
  if (arg instanceof Entity || arg instanceof Pair) {
    return new SingleTermQuery(arg);
  }

  throw new Error("Invalid query argument");
}

class SingleTermQuery implements Query {
  id: Id;

  constructor(component: Id) {
    this.id = component;
  }

  forEachArchetype(callback: (archetype: Archetype) => void): void {
    for (const archetype of this.id.backLinksComponent ?? []) {
      callback(archetype);
    }
  }

  matches(archetype: Archetype): boolean {
    return archetype.components.has(this.id);
  }

  each(callback: (entity: Entity) => void): void {
    for (const archetype of this.id.backLinksComponent ?? []) {
      for (const entity of archetype.entities) {
        callback(entity);
      }
    }
  }
}

class WildcardQuery implements Query {
  relationship: Entity;

  constructor(relationship: Entity) {
    this.relationship = relationship;
  }

  forEachArchetype(callback: (archetype: Archetype) => void): void {
    this.relationship.backLinksRelationship
      ?.entries()
      .flatMap(([, pair]) => pair.backLinksComponent?.keys() ?? [])
      .forEach(callback);
  }

  matches(archetype: Archetype): boolean {
    return archetype.components
      .keys()
      .filter((component) => isPair(component))
      .some((pair) => pair.relationship === this.relationship);
  }

  each(callback: (entity: Entity) => void): void {
    this.relationship.backLinksRelationship
      ?.entries()
      .flatMap(([, pair]) => pair.backLinksComponent?.keys() ?? [])
      .forEach((archetype) => {
        for (const entity of archetype.entities) {
          callback(entity);
        }
      });
  }
}
