import { Entity, Id, Pair } from "./EntityData";

export enum LinkType {
  Add,
  Remove,
}

export function reverseLinkType(linkType: LinkType): LinkType {
  switch (linkType) {
    case LinkType.Add:
      return LinkType.Remove;
    case LinkType.Remove:
      return LinkType.Add;
  }
}

type NewLink = {
  component: Id;
  type: LinkType;
  target: Archetype;
  source: Archetype;
};

export class Archetype {
  readonly components: ReadonlySet<Id>;

  entities = new Set<Entity>();

  constructor(components: ReadonlySet<Id>) {
    this.components = components;
  }

  #preppedLinksAdd = new Map<Id, NewLink>();
  #preppedLinksRemove = new Map<Id, NewLink>();

  #linksTargetingThis = new Set<NewLink>();

  getLinkCount() {
    return this.#preppedLinksAdd.size + this.#preppedLinksRemove.size;
  }

  getLink(type: LinkType, id: Id): Archetype | undefined {
    if (type === LinkType.Add) {
      return this.#preppedLinksAdd.get(id)?.target;
    }
    if (type === LinkType.Remove) {
      return this.#preppedLinksRemove.get(id)?.target;
    }
    return undefined;
  }

  setLink(type: LinkType, id: Id, target: Archetype) {
    const link = {
      component: id,
      type,
      target: target,
      source: this,
    };

    target.#linksTargetingThis.add(link);

    if (type === LinkType.Add) {
      this.#preppedLinksAdd.set(id, link);
    }
    if (type === LinkType.Remove) {
      this.#preppedLinksRemove.set(id, link);
    }
  }

  removeLink(type: LinkType, id: Id) {
    if (type === LinkType.Add) {
      this.#preppedLinksAdd.delete(id);
    }
    if (type === LinkType.Remove) {
      this.#preppedLinksRemove.delete(id);
    }
  }

  detachConnections() {
    for (const component of this.components) {
      component.backLinksComponent?.delete(this);
    }

    for (const link of this.#linksTargetingThis) {
      link.source.removeLink(link.type, link.component);
    }
    this.#linksTargetingThis.clear();
  }

  #hooks = {
    preAdd: {
      asComponent: new Set<(entity: Entity, component: Entity) => void>(),
      asRelationship: new Set<(entity: Entity, pair: Pair) => void>(),
      asTarget: new Set<(entity: Entity, pair: Pair) => void>(),
    },
    postAdd: {
      asComponent: new Set<(entity: Entity, component: Entity) => void>(),
      asRelationship: new Set<(entity: Entity, pair: Pair) => void>(),
      asTarget: new Set<(entity: Entity, pair: Pair) => void>(),
    },
    postRemove: {
      asComponent: new Set<(entity: Entity, component: Entity) => void>(),
      asRelationship: new Set<(entity: Entity, pair: Pair) => void>(),
      asTarget: new Set<(entity: Entity, pair: Pair) => void>(),
    },
  };
  setHook(
    phase: Phase,
    operation: Operation.asComponent,
    hook: (entity: Entity, component: Entity) => void,
  ): void;
  setHook(
    phase: Phase,
    operation: Operation.asRelationship,
    hook: (entity: Entity, pair: Pair) => void,
  ): void;
  setHook(
    phase: Phase,
    operation: Operation.asTarget,
    hook: (entity: Entity, pair: Pair) => void,
  ): void;
  setHook(
    phase: Phase,
    operation: Operation,
    hook:
      | ((entity: Entity, component: Entity) => void)
      | ((entity: Entity, pair: Pair) => void),
  ) {
    const phaseContainer = (() => {
      switch (phase) {
        case Phase.preAdd:
          return this.#hooks.preAdd;
        case Phase.postAdd:
          return this.#hooks.postAdd;
        case Phase.postRemove:
          return this.#hooks.postRemove;
      }
    })();

    if (operation === Operation.asComponent) {
      phaseContainer.asComponent.add(
        hook as (entity: Entity, component: Entity) => void,
      );
    }
    if (operation === Operation.asRelationship) {
      phaseContainer.asRelationship.add(
        hook as (entity: Entity, pair: Pair) => void,
      );
    }
    if (operation === Operation.asTarget) {
      phaseContainer.asTarget.add(hook as (entity: Entity, pair: Pair) => void);
    }
  }

  getHooks(
    phase: Phase,
    operation: Operation.asComponent,
  ): Set<(entity: Entity, component: Entity) => void>;
  getHooks(
    phase: Phase,
    operation: Operation.asRelationship,
  ): Set<(entity: Entity, pair: Pair) => void>;
  getHooks(
    phase: Phase,
    operation: Operation.asTarget,
  ): Set<(entity: Entity, pair: Pair) => void>;
  getHooks(
    phase: Phase,
    operation: Operation,
  ):
    | Set<(entity: Entity, component: Entity) => void>
    | Set<(entity: Entity, pair: Pair) => void> {
    const phaseContainer = (() => {
      switch (phase) {
        case Phase.preAdd:
          return this.#hooks.preAdd;
        case Phase.postAdd:
          return this.#hooks.postAdd;
        case Phase.postRemove:
          return this.#hooks.postRemove;
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
