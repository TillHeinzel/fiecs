import { Entity, Pair } from "./Core/EntityData";

export function ensureRelationshipId(type: Entity, target: Entity): Pair {
  return lookupRelationshipId() ?? createRelationshipId();

  function lookupRelationshipId() {
    return type.backLinksRelationship?.get(target);
  }

  function createRelationshipId() {
    const newId = new Pair(type, target);
    if (type.backLinksRelationship === undefined)
      type.backLinksRelationship = new Map();
    type.backLinksRelationship.set(target, newId);
    if (target.backLinksTarget === undefined)
      target.backLinksTarget = new Map();
    target.backLinksTarget.set(type, newId);
    return newId;
  }
}
