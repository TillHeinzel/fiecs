import { Backend, Operation, Phase } from "./Backend";
import {
  canDefaultInitialize,
  getARelationshipPair,
  getName,
  getRelationshipTargets,
  has,
  isInUseAsComponent,
} from "./Backend/Core/EntityData";
import { Hooks } from "./Backend/Core/Hooks";
import { ensureRelationshipId } from "./Backend/ensureRelationshipId";
import { makeQuery, wildcard } from "./Backend/Query";
import { down, traverseRelationship } from "./Backend/RelationshipTraversal";

// TODO[epic=???] - These should be implemented through the public interface of the ECS, through handles and shit

export function builtinTraits(backend: Backend) {
  const Trait = backend.createTag("Trait");
  backend.add(Trait, Trait);
  backend.addHook(
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(Trait),
    (pair, entity) => {
      if (isInUseAsComponent(entity)) {
        throw new Error(
          `Component "${getName(pair.type)}" is a Trait and cannot be added to a component that is already in use!`,
        );
      }
    },
  );

  const Relationship = backend.createTag("Relationship");
  backend.add(Relationship, Trait);
  backend.addHook(
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(Relationship),
    (component) => {
      throw new Error(
        `Component "${component.name}" is purely a relationship and cannot be used as a component`,
      );
    },
  );
  backend.addHook(
    Phase.preAdd,
    Operation.asTarget,
    makeQuery(Relationship),
    (pair) => {
      if (!has(pair.type, Trait)) {
        throw new Error(
          `Component "${pair.target.name}" is purely a relationship and cannot be used as a target of a relationship`,
        );
      }
    },
  );

  const Acyclic = backend.createTag("Acyclic");
  backend.add(Acyclic, Trait);
  backend.addHook(
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(Acyclic),
    (pair, entity) => {
      const relationship = pair.type;
      const target = pair.target;

      if (!has(relationship, Acyclic)) return;

      if (target === entity) {
        throw new Error(
          `Relationship "${relationship.name}" is acyclic and cannot target the entity it is added to`,
        );
      }

      traverseRelationship(relationship, target, down).visit(
        (currentTarget) => {
          if (currentTarget === entity) {
            throw new Error(
              `Relationship "${relationship.name}" is acyclic and cannot be added to an entity that would create a cycle`,
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
  backend.addHook(
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(RelationshipHasNoDataSpecialTag),
    (component, entity) => {
      if (component !== RelationshipHasNoData) return;
      entity.relationshipHasNoData = true;
    },
  );

  const TargetMustBeDefaultInitializable = backend.createTag(
    "TargetMustBeDefaultInitializable",
  );
  backend.add(TargetMustBeDefaultInitializable, Trait);
  backend.addHook(
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(TargetMustBeDefaultInitializable),
    (pair) => {
      const relationship = pair.type;
      const target = pair.target;

      if (!canDefaultInitialize(target)) {
        throw new Error(
          `Relationship "${relationship.name}" is marked as TargetMustBeDefaultInitializable while target "${target.name}" has data and is not default initializable`,
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
  backend.addHook(
    Phase.postAdd,
    Operation.asRelationship,
    makeQuery([With, wildcard]),
    (pair, entity) => {
      getRelationshipTargets(pair.type, With)
        .keys()
        .forEach((withComp) =>
          backend.add(entity, ensureRelationshipId(withComp, pair.target)),
        );
    },
  );
  const WithSpecialTag = backend.createTag("WithSpecialTag");
  backend.add(WithSpecialTag, Trait);
  backend.add(With, WithSpecialTag);

  backend.addHook(
    Phase.postAdd,
    Operation.asRelationship,
    makeQuery(WithSpecialTag),
    (pair) => {
      if (pair.type !== With) return;

      if (!pair.target.hooks) {
        pair.target.hooks = new Hooks();
      }

      pair.target.hooks.add(
        Phase.postRemove,
        Operation.asComponent,
        (component, entity) => {
          With.backLinksType
            ?.get(component)
            ?.backLinksComponent?.keys()
            .flatMap((archetype) => archetype.entities)
            .forEach((withedTarget) => {
              backend.remove(entity, withedTarget);
            });
        },
      );
      pair.target.hooks.add(
        Phase.postRemove,
        Operation.asRelationship,
        (pair, entity) => {
          With.backLinksType
            ?.get(pair.type)
            ?.backLinksComponent?.keys()
            .flatMap((archetype) => archetype.entities)
            ?.map((withComp) => ensureRelationshipId(withComp, pair.target))
            .forEach((withedTarget) => {
              backend.remove(entity, withedTarget);
            });
        },
      );
    },
  );

  backend.addHook(
    Phase.postAdd,
    Operation.asComponent,
    makeQuery([With, wildcard]),
    (component, entity) => {
      getRelationshipTargets(component, With)
        .keys()
        .forEach((withId) => backend.add(entity, withId));
    },
  );

  const Singleton = backend.createTag("Singleton");
  backend.add(Singleton, Trait);
  backend.addHook(
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(Singleton),
    (component, entity) => {
      if (entity !== component) {
        throw new Error(
          `Component "${component.name}" is a singleton and cannot be added to entities other than itself`,
        );
      }
    },
  );

  const Symmetric = backend.createTag("Symmetric");
  backend.add(Symmetric, Trait);
  backend.addHook(
    Phase.postAdd,
    Operation.asRelationship,
    makeQuery(Symmetric),
    (pair, entity) => {
      backend.add(pair.target, backend.relationship(pair.type, entity));
    },
  );
  backend.addHook(
    Phase.postRemove,
    Operation.asRelationship,
    makeQuery(Symmetric),
    (pair, entity) => {
      backend.remove(pair.target, backend.relationship(pair.type, entity));
    },
  );

  const Target = backend.createTag("Target");
  backend.add(Target, Trait);
  backend.addHook(
    Phase.preAdd,
    Operation.asComponent,
    makeQuery(Target),
    (component) => {
      throw new Error(
        `Entity "${component.name}" is marked as a Target and cannot be used as a component`,
      );
    },
  );
  backend.addHook(
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(Target),
    (pair) => {
      throw new Error(
        `Entity "${pair.type.name}" is marked as a Target and cannot be used as a relationship`,
      );
    },
  );

  const Exclusive = backend.createTag("Exclusive");
  backend.add(Exclusive, Trait);
  backend.addHook(
    Phase.preAdd,
    Operation.asRelationship,
    makeQuery(Exclusive),
    (pair, entity) => {
      const currentPair = getARelationshipPair(entity, pair.type);

      if (currentPair !== undefined) {
        backend.remove(entity, currentPair);

        getRelationshipTargets(pair.type, With)
          .keys()
          .forEach((withComp) =>
            backend.remove(
              entity,
              ensureRelationshipId(withComp, currentPair.target),
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
