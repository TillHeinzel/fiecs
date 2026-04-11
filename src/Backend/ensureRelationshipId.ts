import { Entity, Pair } from "./Core/EntityData";

export function ensureRelationshipId(type: Entity, target: Entity) {
  return lookupRelationshipId() ?? createRelationshipId();

  function lookupRelationshipId() {
    return type.backLinksType?.get(target);
  }

  function createRelationshipId() {
    const newId = new Pair(type, target);
    if (type.backLinksType === undefined) type.backLinksType = new Map();
    type.backLinksType.set(target, newId);
    if (target.backLinksTarget === undefined)
      target.backLinksTarget = new Map();
    target.backLinksTarget.set(type, newId);
    return newId;
  }
}
