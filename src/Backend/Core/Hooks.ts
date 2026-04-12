import { Entity, Id } from "./EntityData";

export class Hooks {
  private phases: Map<Phase, PhaseContainer> = new Map();

  add(phase: Phase, operation: Operation, hook: HookCallback) {
    const phaseContainer = (() => {
      const existing = this.phases.get(phase);
      if (existing) {
        return existing;
      }
      const newContainer = new PhaseContainer();
      this.phases.set(phase, newContainer);
      return newContainer;
    })();

    if (operation === Operation.asComponent) {
      phaseContainer.asComponent.add(hook);
    }
    if (operation === Operation.asRelationship) {
      phaseContainer.asRelationship.add(hook);
    }
    if (operation === Operation.asTarget) {
      phaseContainer.asTarget.add(hook);
    }
  }

  run(phase: Phase, operation: Operation, id: Id, entity: Entity) {
    const phaseContainer = this.phases.get(phase);
    if (phaseContainer === undefined) return new Set();

    if (operation === Operation.asComponent) {
      phaseContainer.asComponent.forEach((hook) => hook(id, entity));
      return;
    }
    if (operation === Operation.asRelationship) {
      phaseContainer.asRelationship.forEach((hook) => hook(id, entity));
      return;
    }
    if (operation === Operation.asTarget) {
      phaseContainer.asTarget.forEach((hook) => hook(id, entity));
      return;
    }

    throw new Error("Unsupported phase or operation");
  }
}

class PhaseContainer {
  asComponent = new Set<HookCallback>();
  asRelationship = new Set<HookCallback>();
  asTarget = new Set<HookCallback>();
}

export type HookCallback = (id: Id, entity: Entity) => void;

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
