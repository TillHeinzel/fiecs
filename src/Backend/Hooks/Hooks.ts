export class Hooks<Entity, Pair> {
  private phases: Map<Phase, PhaseContainer<Entity, Pair>> = new Map();

  add(phase: Phase, operation: Operation, hook: HookCallback<Entity, Pair>) {
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

  run(phase: Phase, operation: Operation, id: Entity | Pair, entity: Entity) {
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

class PhaseContainer<Entity, Pair> {
  asComponent = new Set<HookCallback<Entity, Pair>>();
  asRelationship = new Set<HookCallback<Entity, Pair>>();
  asTarget = new Set<HookCallback<Entity, Pair>>();
}

export type HookCallback<Entity, Pair> = (
  id: Entity | Pair,
  entity: Entity,
) => void;

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
