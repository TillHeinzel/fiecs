import { Entity, getRelationshipTargets } from "./EntityData";

export function traverseRelationship(
  relationship: Entity,
  start: Entity,
  direction: typeof up | typeof down,
  algorithm: typeof breadthFirst | typeof depthFirst = depthFirst,
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

export function breadthFirst(
  entity: Entity,
  relationship: Entity,
  getTargets: (entity: Entity, relationship: Entity) => IteratorObject<Entity>,
  callback: (target: Entity) => void,
) {
  recurse(getTargets(entity, relationship));

  function recurse(targets: IteratorObject<Entity>) {
    targets.forEach((target) => {
      callback(target);
    });

    recurse(targets.flatMap((target) => getTargets(target, relationship)));
  }
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

export function up(entity: Entity, relationship: Entity) {
  return (
    relationship.backLinksType
      ?.get(entity)
      ?.backLinksComponent?.keys()
      .flatMap((archetype) => archetype.entities) ?? new Set<Entity>().keys()
  );
}

export function down(entity: Entity, relationship: Entity) {
  return getRelationshipTargets(entity, relationship).keys();
}
