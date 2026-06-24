import { Backend, Entity, HookCallback, Operation, Pair, Phase } from "./";
import {
  DoubleWildcard,
  RelationshipWildcard,
  Wildcard,
  WildcardTarget,
} from "./BasicTypes/BasicObjects";

type ComponentHookCallback = (component: Entity, entity: Entity) => void;
type RelationshipHookCallback = (pair: Pair, entity: Entity) => void;

type QueryTypeTT =
  | Entity
  | RelationshipWildcard
  | Wildcard
  | WildcardTarget
  | DoubleWildcard;

function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asComponent,
  query: QueryTypeTT,
  callback: ComponentHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asRelationship,
  query: QueryTypeTT,
  callback: RelationshipHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asTarget,
  query: QueryTypeTT,
  callback: RelationshipHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation,
  query: QueryTypeTT,
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

export function addBuiltinTraits(backend: Backend) {
  const Trait = backend.tag("Trait");
  backend.add(Trait, Trait);

  const traitCheckCallback = (pair: Entity | Pair, entity: Entity) => {
    const isInUseAsComponent = (() => {
      return (
        entity.matchingArchetypes().some(() => true) ||
        backend
          .relationshipWildcard(entity)
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
    Trait,
    traitCheckCallback,
  );
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    Trait,
    traitCheckCallback,
  );
  addHook(backend, Phase.preAdd, Operation.asTarget, Trait, traitCheckCallback);

  const Relationship = backend.tag("Relationship");
  backend.add(Relationship, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    Relationship,
    (component) => {
      throw new Error(
        `Component "${backend.getDisplayName(component)}" is purely a relationship and cannot be used as a component`,
      );
    },
  );
  addHook(backend, Phase.preAdd, Operation.asTarget, Relationship, (pair) => {
    if (!backend.has(pair.relationship, Trait)) {
      throw new Error(
        `Component "${backend.getDisplayName(pair.target)}" is purely a relationship and cannot be used as a target of a relationship`,
      );
    }
  });

  const Acyclic = backend.tag("Acyclic");
  backend.add(Acyclic, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    Acyclic,
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
          .getComponents(
            currentTarget,
            backend.relationshipWildcard(relationship),
          )
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
    RelationshipHasNoDataSpecialTag,
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
    TargetMustBeDefaultInitializable,
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
    backend.relationshipWildcard(With),
    (pair, entity) => {
      backend
        .getComponents(pair.relationship, backend.relationshipWildcard(With))
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
    WithSpecialTag,
    (pair) => {
      if (pair.relationship !== With) return;

      addHookToEntity(
        backend,
        Phase.postRemove,
        Operation.asComponent,
        pair.target,
        (component, entity) => {
          backend
            .pair(With, component)
            .matchingArchetypes()
            .flatMap((archetype) => archetype.entities)
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
            .pair(With, pair.relationship)
            .matchingArchetypes()
            .flatMap((archetype) => archetype.entities)
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
    backend.relationshipWildcard(With),
    (component, entity) => {
      backend
        .getComponents(component, backend.relationshipWildcard(With))

        .forEach((withId) => backend.add(entity, (withId as Pair).target));
    },
  );

  const Singleton = backend.tag("Singleton");
  backend.add(Singleton, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    Singleton,
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
    Symmetric,
    (pair, entity) => {
      backend.add(pair.target, backend.pair(pair.relationship, entity));
    },
  );
  addHook(
    backend,
    Phase.postRemove,
    Operation.asRelationship,
    Symmetric,
    (pair, entity) => {
      backend.remove(pair.target, backend.pair(pair.relationship, entity));
    },
  );

  const Target = backend.tag("Target");
  backend.add(Target, Trait);
  addHook(backend, Phase.preAdd, Operation.asComponent, Target, (component) => {
    throw new Error(
      `Entity "${backend.getDisplayName(component)}" is marked as a Target and cannot be used as a component`,
    );
  });
  addHook(backend, Phase.preAdd, Operation.asRelationship, Target, (pair) => {
    throw new Error(
      `Entity "${backend.getDisplayName(pair.relationship)}" is marked as a Target and cannot be used as a relationship`,
    );
  });

  const Exclusive = backend.tag("Exclusive");
  backend.add(Exclusive, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    Exclusive,
    (pair, entity) => {
      const currentPair = backend.findComponent(
        entity,
        backend.relationshipWildcard(pair.relationship),
      ) as Pair | undefined;

      if (currentPair !== undefined) {
        backend.remove(entity, currentPair);

        backend
          .getComponents(pair.relationship, backend.relationshipWildcard(With))
          .forEach((withComp) =>
            backend.remove(
              entity,
              backend.pair((withComp as Pair).target, currentPair.target),
            ),
          );
      }
    },
  );

  const ChildOf = backend.tag("ChildOf");
  backend.add(ChildOf, Trait);
  backend.add(ChildOf, Relationship);
  backend.add(ChildOf, Acyclic);
  backend.add(ChildOf, RelationshipHasNoData);
  backend.add(ChildOf, Exclusive);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    ChildOf,
    (pair, entity) => {
      const parent = pair.target;
      if (parent.name !== undefined && entity.name !== undefined) {
        backend.setLookupPath(entity, parent.name + "::" + entity.name);
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
    ChildOf,
  };
}

function isPair(component: Entity | Pair): component is Pair {
  return component.isPair();
}
