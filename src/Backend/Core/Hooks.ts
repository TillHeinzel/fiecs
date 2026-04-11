import { Archetype } from "./Archetype";
import { Entity, Id, isPair, Pair } from "./EntityData";

export class Hooks {
  private preAdd = new PhaseContainer();
  private postAdd = new PhaseContainer();
  private postRemove = new PhaseContainer();

  add(
    phase: Phase,
    operation: Operation.asComponent,
    hook: ComponentHookCallback,
  ): void;
  add(
    phase: Phase,
    operation: Operation.asRelationship,
    hook: RelationshipHookCallback,
  ): void;
  add(
    phase: Phase,
    operation: Operation.asTarget,
    hook: RelationshipHookCallback,
  ): void;
  add(
    phase: Phase,
    operation: Operation,
    hook: ComponentHookCallback | RelationshipHookCallback,
  ) {
    const phaseContainer = (() => {
      switch (phase) {
        case Phase.preAdd:
          return this.preAdd;
        case Phase.postAdd:
          return this.postAdd;
        case Phase.postRemove:
          return this.postRemove;
      }
    })();

    if (operation === Operation.asComponent) {
      phaseContainer.asComponent.add(hook as ComponentHookCallback);
    }
    if (operation === Operation.asRelationship) {
      phaseContainer.asRelationship.add(hook as RelationshipHookCallback);
    }
    if (operation === Operation.asTarget) {
      phaseContainer.asTarget.add(hook as RelationshipHookCallback);
    }
  }

  get(
    phase: Phase,
    operation: Operation.asComponent,
  ): Set<ComponentHookCallback>;
  get(
    phase: Phase,
    operation: Operation.asRelationship,
  ): Set<RelationshipHookCallback>;
  get(
    phase: Phase,
    operation: Operation.asTarget,
  ): Set<RelationshipHookCallback>;
  get(
    phase: Phase,
    operation: Operation,
  ): Set<ComponentHookCallback> | Set<RelationshipHookCallback> {
    const phaseContainer = (() => {
      switch (phase) {
        case Phase.preAdd:
          return this.preAdd;
        case Phase.postAdd:
          return this.postAdd;
        case Phase.postRemove:
          return this.postRemove;
      }
    })();

    if (operation === Operation.asComponent) {
      return phaseContainer.asComponent;
    }
    if (operation === Operation.asRelationship) {
      return phaseContainer.asRelationship;
    }
    if (operation === Operation.asTarget) {
      return phaseContainer.asTarget;
    }

    throw new Error("Unsupported phase or operation");
  }
}

class PhaseContainer {
  asComponent = new Set<ComponentHookCallback>();
  asRelationship = new Set<RelationshipHookCallback>();
  asTarget = new Set<RelationshipHookCallback>();
}

export const runAllHooks = (phase: Phase, id: Id, entity: Entity) => {
  function runHooksFrom(
    hookSource: Archetype | Entity,
    operation: Operation,
  ): void {
    if (hookSource.hooks !== undefined)
      hookSource.hooks
        // @ts-expect-error // this is an annoying consequence of the way I've typed Hooks.get, which is that it doesn't know that if you pass Operation.asComponent, you'll get a Set<ComponentHookCallback> back, and if you pass Operation.asRelationship, you'll get a Set<RelationshipHookCallback> back. I think this is still better than the alternative, which is to have separate get methods for each operation type, but it does mean that I have to add this @ts-expect-error here and do some manual type assertions in the Hooks.get method.
        .get(phase, operation)
        // @ts-expect-error // this is an annoying consequence of the way I've typed Hooks.get, which is that it doesn't know that if you pass Operation.asComponent, you'll get a Set<ComponentHookCallback> back, and if you pass Operation.asRelationship, you'll get a Set<RelationshipHookCallback> back. I think this is still better than the alternative, which is to have separate get methods for each operation type, but it does mean that I have to add this @ts-expect-error here and do some manual type assertions in the Hooks.get method.
        .forEach((hook) => hook(id, entity));
  }

  if (isPair(id)) {
    runHooksFrom(id.type.archetype, Operation.asRelationship);
    runHooksFrom(id.type, Operation.asRelationship);
    runHooksFrom(id.target.archetype, Operation.asTarget);
    runHooksFrom(id.target, Operation.asTarget);
  } else {
    runHooksFrom(id.archetype, Operation.asComponent);
    runHooksFrom(id, Operation.asComponent);
  }
};

export type ComponentHookCallback = (component: Entity, entity: Entity) => void;
export type RelationshipHookCallback = (pair: Pair, entity: Entity) => void;

export enum Phase {
  preAdd,
  postAdd,
  postRemove,
}

export enum Operation {
  asComponent,
  asRelationship,
  asTarget,
}

export enum LinkType {
  Add,
  Remove,
}
