import {
  Backend,
  Entity,
  HookCallback,
  Operation,
  Pair,
  Phase,
} from "./Backend";
import { makeQuery, Query, wildcard } from "./Backend/Query";
import {
  down,
  traverseRelationship,
} from "./Backend/Storage/RelationshipTraversal";

// TODO[epic=???] - These should be implemented through the public interface of the ECS, through handles and shit

type ComponentHookCallback = (component: Entity, entity: Entity) => void;
type RelationshipHookCallback = (pair: Pair, entity: Entity) => void;

function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asComponent,
  query: Query,
  callback: ComponentHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asRelationship,
  query: Query,
  callback: RelationshipHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation.asTarget,
  query: Query,
  callback: RelationshipHookCallback,
): void;
function addHook(
  backend: Backend,
  phase: Phase,
  operation: Operation,
  query: Query,
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
  const Trait = backend.createTag("Trait");
  backend.add(Trait, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(Trait),
    (pair, entity) => {
      if (entity.isInUseAsComponent()) {
        throw new Error(
          `Component "${backend.getDisplayName(pair.relationship)}" is a Trait and cannot be added to a component that is already in use!`,
        );
      }
    },
  );

  const Relationship = backend.createTag("Relationship");
  backend.add(Relationship, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(Relationship),
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
    makeQuery(Relationship),
    (pair) => {
      if (!backend.has(pair.relationship, Trait)) {
        throw new Error(
          `Component "${backend.getDisplayName(pair.target)}" is purely a relationship and cannot be used as a target of a relationship`,
        );
      }
    },
  );

  const Acyclic = backend.createTag("Acyclic");
  backend.add(Acyclic, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(Acyclic),
    (pair, entity) => {
      const relationship = pair.relationship;
      const target = pair.target;

      if (!backend.has(relationship, Acyclic)) return;

      if (target === entity) {
        throw new Error(
          `Relationship "${backend.getDisplayName(relationship)}" is acyclic and cannot target the entity it is added to`,
        );
      }

      traverseRelationship(relationship, target, down).visit(
        (currentTarget) => {
          if (currentTarget === entity) {
            throw new Error(
              `Relationship "${backend.getDisplayName(relationship)}" is acyclic and cannot be added to an entity that would create a cycle`,
            );
          }
        },
      );
    },
  );

  const RelationshipHasNoData = backend.createTag("RelationshipHasNoData");
  const RelationshipHasNoDataSpecialTag = backend.createTag(
    "RelationshipHasNoDataSpecialTag",
  );
  backend.add(RelationshipHasNoData, Trait);
  backend.add(RelationshipHasNoData, RelationshipHasNoDataSpecialTag);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(RelationshipHasNoDataSpecialTag),
    (component, entity) => {
      if (component !== RelationshipHasNoData) return;
      entity._relationshipHasNoData = true;
    },
  );

  const TargetMustBeDefaultInitializable = backend.createTag(
    "TargetMustBeDefaultInitializable",
  );
  backend.add(TargetMustBeDefaultInitializable, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(TargetMustBeDefaultInitializable),
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

  const With = backend.createTag("With");
  backend.add(With, Trait);
  backend.add(With, Relationship);
  backend.add(With, RelationshipHasNoData);
  backend.add(With, Acyclic);
  backend.add(With, TargetMustBeDefaultInitializable);
  addHook(
    backend,
    Phase.postAdd,
    Operation.asRelationship,
    makeQuery([With, wildcard]),
    (pair, entity) => {
      backend
        .getRelationshipTargets(pair.relationship, With)
        .keys()
        .forEach((withComp) =>
          backend.add(entity, backend.relationship(withComp, pair.target)),
        );
    },
  );
  const WithSpecialTag = backend.createTag("WithSpecialTag");
  backend.add(WithSpecialTag, Trait);
  backend.add(With, WithSpecialTag);

  addHook(
    backend,
    Phase.postAdd,
    Operation.asRelationship,
    makeQuery(WithSpecialTag),
    (pair) => {
      if (pair.relationship !== With) return;

      addHookToEntity(
        backend,
        Phase.postRemove,
        Operation.asComponent,
        pair.target,
        (component, entity) => {
          With.backLinksRelationship
            ?.get(component)
            ?.backLinksComponent?.keys()
            .flatMap((archetype) => archetype.entities)
            .forEach((withedTarget) => {
              backend.remove(entity, withedTarget);
            });
        },
      );
      addHookToEntity(
        backend,
        Phase.postRemove,
        Operation.asRelationship,
        pair.target,
        (pair, entity) => {
          With.backLinksRelationship
            ?.get(pair.relationship)
            ?.backLinksComponent?.keys()
            .flatMap((archetype) => archetype.entities)
            ?.map((withComp) => backend.relationship(withComp, pair.target))
            .forEach((withedTarget) => {
              backend.remove(entity, withedTarget);
            });
        },
      );
    },
  );

  addHook(
    backend,
    Phase.postAdd,
    Operation.asComponent,
    makeQuery([With, wildcard]),
    (component, entity) => {
      backend
        .getRelationshipTargets(component, With)
        .keys()
        .forEach((withId) => backend.add(entity, withId));
    },
  );

  const Singleton = backend.createTag("Singleton");
  backend.add(Singleton, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(Singleton),
    (component, entity) => {
      if (entity !== component) {
        throw new Error(
          `Component "${backend.getDisplayName(component)}" is a singleton and cannot be added to entities other than itself`,
        );
      }
    },
  );

  const Symmetric = backend.createTag("Symmetric");
  backend.add(Symmetric, Trait);
  addHook(
    backend,
    Phase.postAdd,
    Operation.asRelationship,
    makeQuery(Symmetric),
    (pair, entity) => {
      backend.add(pair.target, backend.relationship(pair.relationship, entity));
    },
  );
  addHook(
    backend,
    Phase.postRemove,
    Operation.asRelationship,
    makeQuery(Symmetric),
    (pair, entity) => {
      backend.remove(
        pair.target,
        backend.relationship(pair.relationship, entity),
      );
    },
  );

  const Target = backend.createTag("Target");
  backend.add(Target, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(Target),
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
    makeQuery(Target),
    (pair) => {
      throw new Error(
        `Entity "${backend.getDisplayName(pair.relationship)}" is marked as a Target and cannot be used as a relationship`,
      );
    },
  );

  const Exclusive = backend.createTag("Exclusive");
  backend.add(Exclusive, Trait);
  addHook(
    backend,
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(Exclusive),
    (pair, entity) => {
      const currentPair = backend.getARelationshipPair(
        entity,
        pair.relationship,
      );

      if (currentPair !== undefined) {
        backend.remove(entity, currentPair);

        backend
          .getRelationshipTargets(pair.relationship, With)
          .keys()
          .forEach((withComp) =>
            backend.remove(
              entity,
              backend.relationship(withComp, currentPair.target),
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
