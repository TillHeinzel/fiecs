import { Entity, Pair } from "./BasicObjects";

export function ensureRelationshipId(
  relationship: Entity,
  target: Entity,
): Pair {
  return lookupRelationshipId() ?? createRelationshipId();

  function lookupRelationshipId() {
    return relationship.backLinksRelationship?.get(target);
  }

  function createRelationshipId() {
    const newId = new Pair({ relationship, target });
    if (relationship.backLinksRelationship === undefined)
      relationship.backLinksRelationship = new Map();
    relationship.backLinksRelationship.set(target, newId);
    if (target.backLinksTarget === undefined)
      target.backLinksTarget = new Map();
    target.backLinksTarget.set(relationship, newId);
    return newId;
  }
}
