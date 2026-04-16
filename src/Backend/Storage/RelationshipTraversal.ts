import { Entity } from "../BasicObjects";

export function traverseRelationship(
  relationship: Entity,
  start: Entity,
  direction: typeof down,
  algorithm: typeof depthFirst = depthFirst,
) {
  return {
    visit(callback: (target: Entity) => void) {
      algorithm(start, relationship, direction, callback);
    },
    accumulateTargets() {
      const targets = new Set<Entity>();
      this.visit((target) => targets.add(target));
      return targets;
    },
  };
}

export function depthFirst(
  entity: Entity,
  relationship: Entity,
  getTargets: (entity: Entity, relationship: Entity) => IteratorObject<Entity>,
  callback: (target: Entity) => void,
) {
  recurse(getTargets(entity, relationship));

  function recurse(targets: IteratorObject<Entity>) {
    targets.forEach((target) => {
      callback(target);
      recurse(getTargets(target, relationship));
    });
  }
}

export function down(entity: Entity, relationship: Entity) {
  return entity
    .getRelationshipPairs(relationship)
    .keys()
    .map((pair) => pair.target);
}
