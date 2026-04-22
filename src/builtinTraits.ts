import {
  Backend,
  Entity,
  HookCallback,
  Operation,
  Pair,
  Phase,
  Query,
} from "./Backend";

// TODO[epic=???] - These should be implemented through the public interface of the ECS, through handles and shit

type ComponentHookCallback = (component: Entity, entity: Entity) => void;
type RelationshipHookCallback = (pair: Pair, entity: Entity) => void;

function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asComponent,
  query: Query<Entity> | Query<Pair>,
  callback: ComponentHookCallback,
): void;

function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asComponent,
  query: Query<Entity | Pair>,
  callback: ComponentHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asRelationship,
  query: Query<Entity> | Query<Pair>,
  callback: RelationshipHookCallback,
): void;

function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asRelationship,
  query: Query<Entity | Pair>,
  callback: RelationshipHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asTarget,
  query: Query<Entity> | Query<Pair>,
  callback: RelationshipHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asTarget,
  query: Query<Entity | Pair>,
  callback: RelationshipHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation,
  query: Query<Entity | Pair>,
  callback: ComponentHookCallback | RelationshipHookCallback,
) {
  backend.addHook(phase, operation, query, callback as HookCallback);
}

function addHookToEntity(
  backend: Backend,
  phase: Phase,
  operation: Operation.asComponent,
  entity: Entity,
  callback: ComponentHookCallback,
): void;
function addHookToEntity(
  backend: Backend,
  phase: Phase,
  operation: Operation.asRelationship,
  entity: Entity,
  callback: RelationshipHookCallback,
): void;
function addHookToEntity(
  backend: Backend,
  phase: Phase,
  operation: Operation.asTarget,
  entity: Entity,
  callback: RelationshipHookCallback,
): void;
function addHookToEntity(
  backend: Backend,
  phase: Phase,
  operation: Operation,
  entity: Entity,
  callback: ComponentHookCallback | RelationshipHookCallback,
) {
  backend.addHookToEntity(phase, operation, entity, callback as HookCallback);
}

export function builtinTraits(backend: Backend) {
  const Trait = backend.tag("Trait");
  backend.add(Trait, Trait);

  const traitCheckCallback = (pair: Entity | Pair, entity: Entity) => {
    const isInUseAsComponent = (() => {
      return (
        backend
          .makeSingleTermQuery(entity)
          .matchingArchetypes()
          .some(() => true) ||
        backend
          .makeSingleTermQuery([entity, backend.wildcard] as const)
          .matchingArchetypes()
          .some(() => true)
      );
    })();

    if (isInUseAsComponent) {
      throw new Error(
        `Component "${backend.getDisplayName(pair)}" is a Trait and cannot be added to a component that is already in use!`,
      );
    }
  };

  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    backend.makeSingleTermQuery(Trait),
    traitCheckCallback,
  );
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery(Trait),
    traitCheckCallback,
  );
  addHook(
    backend,
    Phase.preAdd,
    Operation.asTarget,
    backend.makeSingleTermQuery(Trait),
    traitCheckCallback,
  );

  const Relationship = backend.tag("Relationship");
  backend.add(Relationship, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    backend.makeSingleTermQuery(Relationship),
    (component) => {
      throw new Error(
        `Component "${backend.getDisplayName(component)}" is purely a relationship and cannot be used as a component`,
      );
    },
  );
  addHook(
    backend,
    Phase.preAdd,
    Operation.asTarget,
    backend.makeSingleTermQuery(Relationship),
    (pair) => {
      if (!backend.has(pair.relationship, Trait)) {
        throw new Error(
          `Component "${backend.getDisplayName(pair.target)}" is purely a relationship and cannot be used as a target of a relationship`,
        );
      }
    },
  );

  const Acyclic = backend.tag("Acyclic");
  backend.add(Acyclic, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery(Acyclic),
    (pair, entity) => {
      const relationship = pair.relationship;
      const target = pair.target;

      if (!backend.has(relationship, Acyclic)) return;

      if (target === entity) {
        throw new Error(
          `Relationship "${backend.getDisplayName(relationship)}" is acyclic and cannot target the entity it is added to`,
        );
      }

      const callback = (currentTarget: Entity) => {
        if (currentTarget === entity) {
          throw new Error(
            `Relationship "${backend.getDisplayName(relationship)}" is acyclic and cannot be added to an entity that would create a cycle`,
          );
        }
      };

      const getChildren = (currentTarget: Entity) =>
        backend
          .getComponents(currentTarget, [
            relationship,
            backend.wildcard,
          ] as const)
          .filter((component) => isPair(component))
          .map((pair) => (pair as Pair).target);

      recurse(getChildren(target));

      function recurse(targets: IteratorObject<Entity>) {
        targets.forEach((target) => {
          callback(target);
          recurse(getChildren(target));
        });
      }
    },
  );

  const RelationshipHasNoData = backend.tag("RelationshipHasNoData");
  const RelationshipHasNoDataSpecialTag = backend.tag(
    "RelationshipHasNoDataSpecialTag",
  );
  backend.add(RelationshipHasNoData, Trait);
  backend.add(RelationshipHasNoData, RelationshipHasNoDataSpecialTag);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    backend.makeSingleTermQuery(RelationshipHasNoDataSpecialTag),
    (component, entity) => {
      if (component !== RelationshipHasNoData) return;
      entity._relationshipHasNoData = true;
    },
  );

  const TargetMustBeDefaultInitializable = backend.tag(
    "TargetMustBeDefaultInitializable",
  );
  backend.add(TargetMustBeDefaultInitializable, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery(TargetMustBeDefaultInitializable),
    (pair) => {
      const relationship = pair.relationship;
      const target = pair.target;

      if (!backend.canDefaultInitialize(target)) {
        throw new Error(
          `Relationship "${backend.getDisplayName(relationship)}" is marked as TargetMustBeDefaultInitializable while target "${backend.getDisplayName(target)}" has data and is not default initializable`,
        );
      }
    },
  );

  const With = backend.tag("With");
  backend.add(With, Trait);
  backend.add(With, Relationship);
  backend.add(With, RelationshipHasNoData);
  backend.add(With, Acyclic);
  backend.add(With, TargetMustBeDefaultInitializable);
  addHook(
    backend,
    Phase.postAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery([With, backend.wildcard]),
    (pair, entity) => {
      backend
        .getComponents(pair.relationship, [With, backend.wildcard] as const)
        .filter((withComp) => withComp.isPair())
        .forEach((withComp) =>
          backend.add(
            entity,
            backend.pair((withComp as Pair).target, pair.target),
          ),
        );
    },
  );
  const WithSpecialTag = backend.tag("WithSpecialTag");
  backend.add(WithSpecialTag, Trait);
  backend.add(With, WithSpecialTag);

  addHook(
    backend,
    Phase.postAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery(WithSpecialTag),
    (pair) => {
      if (pair.relationship !== With) return;

      addHookToEntity(
        backend,
        Phase.postRemove,
        Operation.asComponent,
        pair.target,
        (component, entity) => {
          backend
            .makeSingleTermQuery([With, component] as const)
            .matchingArchetypes()
            .flatMap(([archetype]) => archetype.entities)
            .forEach((withedComponent) => {
              backend.remove(entity, withedComponent);
            });
        },
      );
      addHookToEntity(
        backend,
        Phase.postRemove,
        Operation.asRelationship,
        pair.target,
        (pair, entity) => {
          backend
            .makeSingleTermQuery([With, pair.relationship] as const)
            .matchingArchetypes()
            .flatMap(([archetype]) => archetype.entities)
            .forEach((withedComponent) => {
              backend.remove(
                entity,
                backend.pair(withedComponent, pair.target),
              );
            });
        },
      );
    },
  );

  addHook(
    backend,
    Phase.postAdd,
    Operation.asComponent,
    backend.makeSingleTermQuery([With, backend.wildcard]),
    (component, entity) => {
      backend
        .getComponents(component, [With, backend.wildcard] as const)

        .forEach((withId) => backend.add(entity, (withId as Pair).target));
    },
  );

  const Singleton = backend.tag("Singleton");
  backend.add(Singleton, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    backend.makeSingleTermQuery(Singleton),
    (component, entity) => {
      if (entity !== component) {
        throw new Error(
          `Component "${backend.getDisplayName(component)}" is a singleton and cannot be added to entities other than itself`,
        );
      }
    },
  );

  const Symmetric = backend.tag("Symmetric");
  backend.add(Symmetric, Trait);
  addHook(
    backend,
    Phase.postAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery(Symmetric),
    (pair, entity) => {
      backend.add(pair.target, backend.pair(pair.relationship, entity));
    },
  );
  addHook(
    backend,
    Phase.postRemove,
    Operation.asRelationship,
    backend.makeSingleTermQuery(Symmetric),
    (pair, entity) => {
      backend.remove(pair.target, backend.pair(pair.relationship, entity));
    },
  );

  const Target = backend.tag("Target");
  backend.add(Target, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    backend.makeSingleTermQuery(Target),
    (component) => {
      throw new Error(
        `Entity "${backend.getDisplayName(component)}" is marked as a Target and cannot be used as a component`,
      );
    },
  );
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery(Target),
    (pair) => {
      throw new Error(
        `Entity "${backend.getDisplayName(pair.relationship)}" is marked as a Target and cannot be used as a relationship`,
      );
    },
  );

  const Exclusive = backend.tag("Exclusive");
  backend.add(Exclusive, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    backend.makeSingleTermQuery(Exclusive),
    (pair, entity) => {
      const currentPair = backend.findComponent(entity, [
        pair.relationship,
        backend.wildcard,
      ] as const) as Pair | undefined;

      if (currentPair !== undefined) {
        backend.remove(entity, currentPair);

        backend
          .getComponents(pair.relationship, [With, backend.wildcard] as const)
          .forEach((withComp) =>
            backend.remove(
              entity,
              backend.pair((withComp as Pair).target, currentPair.target),
            ),
          );
      }
    },
  );

  return {
    Trait,
    Relationship,
    Acyclic,
    RelationshipHasNoData,
    With,
    Singleton,
    Symmetric,
    Target,
    TargetMustBeDefaultInitializable,
    Exclusive,
  };
}

function isPair(component: Entity | Pair): component is Pair {
  return component.isPair();
}
