import { Entity, Id } from "./EntityData";
import { Operation, Phase } from "./Hooks";
import { isPair } from "./Storage/IEntity";

export const runAllHooks = (phase: Phase, id: Id, entity: Entity) => {
  function runHooksFor(component: Entity, operation: Operation): void {
    component.archetype.hooks.run(phase, operation, id, entity);
    component.hooks.run(phase, operation, id, entity);
  }

  if (isPair(id)) {
    runHooksFor(id.relationship, Operation.asRelationship);
    runHooksFor(id.target, Operation.asTarget);
  } else {
    runHooksFor(id, Operation.asComponent);
  }
};
