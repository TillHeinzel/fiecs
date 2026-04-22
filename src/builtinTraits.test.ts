import { describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "./index";

describe("With trait", () => {
  test("The world has a built-in component called with", () => {
    const world = new Fiecs.World();

    expect(world.builtin.With).toBeDefined();
    expect(world.builtin.With).toBeInstanceOf(Fiecs.Entity);
  });

  test("With is a trait, a relationship, acyclic, cannot have data, and only works with targets that can be default initialized", () => {
    const world = new Fiecs.World();

    const withComponent = world.builtin.With;

    expect(withComponent.has(world.builtin.Trait)).toBe(true);
    expect(withComponent.has(world.builtin.Relationship)).toBe(true);
    expect(withComponent.has(world.builtin.Acyclic)).toBe(true);
    expect(withComponent.has(world.builtin.RelationshipHasNoData)).toBe(true);
    expect(
      withComponent.has(world.builtin.TargetMustBeDefaultInitializable),
    ).toBe(true);
  });

  test("Adding the with-trait to a component means that the withed-component will always be added automatically", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("With-trait works when adding implicitly", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.set(power, "amazing");

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("A component can have multiple With's", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();
    const rogues = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    power.add(world.builtin.With, rogues);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(rogues)).toBe(true);
  });

  test("Withs can be chained", () => {
    const world = new Fiecs.World();
    const power = world.tag("power");
    const responsibility = world.tag("responsibility");
    const stress = world.tag("stress");

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    responsibility.add(world.builtin.With, stress);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(stress)).toBe(true);
  });

  test("Withs can be chained multiple times", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();
    const stress = world.tag();
    const sadness = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    responsibility.add(world.builtin.With, stress);
    stress.add(world.builtin.With, sadness);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(stress)).toBe(true);
    expect(peterParker.has(sadness)).toBe(true);
  });

  test("chained Withs add no extra archetypes", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();
    const stress = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    responsibility.add(world.builtin.With, stress);

    world.startStatistics();
    peterParker.add(power);

    expect(world.getStatistics().archetypesAdded).toBe(1);
  });

  test("When with adds components with data, these are default initialized ", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.component(z.string().default("great"));
    const rogues = world.component(z.string().default("lots"));

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    power.add(world.builtin.With, rogues);

    peterParker.add(power);

    expect(peterParker.get(responsibility)).toBe("great");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("When with adds components with data, these are default initialized when implicitly added", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.component(z.string().default("great"));
    const rogues = world.component(z.string().default("lots"));

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    power.add(world.builtin.With, rogues);

    peterParker.set(power, "amazing");

    expect(peterParker.get(responsibility)).toBe("great");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("When with adds components with data, which are already on the entity, these are not modified ", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.component(z.string().default("great"));
    const rogues = world.component(z.string().default("lots"));

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    power.add(world.builtin.With, rogues);

    peterParker.set(responsibility, "huge");
    peterParker.add(power);

    expect(peterParker.get(responsibility)).toBe("huge");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("Removing a trait with a with does not remove the withed trait", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(power);

    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("Removing a trait added due to With also removes the trait that has the With", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
  });

  test("Removing a withed trait works recursively", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();
    const stress = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    responsibility.add(world.builtin.With, stress);

    peterParker.add(power);
    peterParker.remove(stress);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(stress)).toBe(false);
  });

  test("Removing the middle of a with chain clears only the upstream", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();
    const stress = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    responsibility.add(world.builtin.With, stress);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(stress)).toBe(true);
  });

  test("Removing a component due to its With being removed also clears out the data", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.get(power)).toBeUndefined();
  });

  test("A component that is target of With can be added and removed normally, if the With-relationship is not used", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.tag();
    power.add(world.builtin.With, responsibility);

    const peterPorker = world.entity("Peter Porker");

    peterPorker.add(responsibility);
    expect(peterPorker.has(responsibility)).toBe(true);
    expect(peterPorker.has(power)).toBe(false);
    expect(peterPorker.get(power)).toBeUndefined();

    peterPorker.remove(responsibility);
    expect(peterPorker.has(responsibility)).toBe(false);
    expect(peterPorker.has(power)).toBe(false);
    expect(peterPorker.get(power)).toBeUndefined();
  });

  test("Adding the with-trait to a relationship means that the withed-component will be added automatically with the same target", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();

    const great = world.entity("great");
    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.add(power, great);

    expect(peterParker.has(power, great)).toBe(true);
    expect(peterParker.has(responsibility, great)).toBe(true);
  });

  test("Adding the with-trait to a relationship means that the withed-component will be added automatically with the same target on implicit add", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.tag();

    const great = world.entity("great");
    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.set(power, great, "amazing");

    expect(peterParker.has(power, great)).toBe(true);
    expect(peterParker.has(responsibility, great)).toBe(true);
  });

  test("Removing a relationship added through with automatically removes the source-relationship", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();

    const great = world.entity("great");
    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.add(power, great);
    peterParker.remove(responsibility, great);

    expect(peterParker.has(power, great)).toBe(false);
    expect(peterParker.has(responsibility, great)).toBe(false);
  });

  test("Removing a component that has a With does not remove the withed component", () => {
    const world = new Fiecs.World();
    const power = world.component(z.string().default("great"));
    const responsibility = world.component(z.string().default("great"));

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(power);

    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("Removing a component that is added due to with by multiple origins also removes all the components withing it", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const money = world.tag();
    const responsibility = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    money.add(world.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.add(money);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(money)).toBe(false);
  });

  test("Removing a component that is added due to with removes the one withing it, but not any other components withed by that original component", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();
    const rogues = world.tag();

    const peterParker = world.entity("Peter Parker");

    power.add(world.builtin.With, responsibility);
    power.add(world.builtin.With, rogues);

    peterParker.add(power);
    peterParker.remove(rogues);

    expect(peterParker.has(rogues)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  //TODO[epic=atomic operations] When the a component is attempted to be added with With, but it fails, neither should the original, nothing should change
  //TODO[epic=atomic operations] Ensure that adding and removing Withs creates links without destroying existing ones, even if they are single directional
  //TODO[epic=atomic operations] Ensure preAdd, postAdd and postRemove hooks are called correctly for component added/removed due to with
});

describe("Relationship trait", () => {
  test("Relationship is a Trait", () => {
    const world = new Fiecs.World();
    expect(world.builtin.Relationship.has(world.builtin.Trait)).toBe(true);
  });

  test("A component marked as a Relationship cannot be added as a component", () => {
    const world = new Fiecs.World();
    const relationshipComponent = world.tag("relationship component");
    relationshipComponent.add(world.builtin.Relationship);

    const e = world.entity();
    expect(() => e.add(relationshipComponent)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a component',
    );
  });

  test("A component marked as a Relationship cannot be added as a target in a relationship", () => {
    const world = new Fiecs.World();
    const markedRelationship = world.tag("relationship component");
    markedRelationship.add(world.builtin.Relationship);

    const tag = world.tag("some other relationship");

    const e = world.entity();
    expect(() => e.add(tag, markedRelationship)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a target of a relationship',
    );
  });

  test("A component marked as a Relationship CAN be added as a target in a relationship if the relationship is a Trait", () => {
    const world = new Fiecs.World();
    const markedRelationship = world.tag("relationship component");
    markedRelationship.add(world.builtin.Relationship);

    const trait = world.tag("some other relationship");
    trait.add(world.builtin.Trait);

    const e = world.entity();
    expect(() => e.add(trait, markedRelationship)).not.toThrow();
  });
});

describe("RelationshipHasNoData trait", () => {
  test("RelationshipHasNoData is a Trait", () => {
    const world = new Fiecs.World();
    expect(world.builtin.RelationshipHasNoData.has(world.builtin.Trait)).toBe(
      true,
    );
  });

  test("A relationship marked as RelationshipHasNoData cannot have data set on it", () => {
    const world = new Fiecs.World();

    const relationship = world.tag("some relationship");
    relationship.add(world.builtin.RelationshipHasNoData);

    const e = world.entity();
    const target = world.component(z.string());
    target.setName("some target");

    expect(() => e.set(relationship, target, "some data")).toThrow(
      '"(some relationship, some target)" has no data to be set',
    );
  });

  test("A relationship marked as RelationshipHasNoData cannot have data, so is not default initialized", () => {
    const world = new Fiecs.World();

    const relationship = world.tag("some relationship");
    relationship.add(world.builtin.RelationshipHasNoData);

    const e = world.entity();
    const target = world.component(z.string().default("default"));

    e.add(relationship, target);

    expect(e.get(relationship, target)).toBeUndefined();
  });

  test("A relationship marked as RelationshipHasNoData cannot have data & can thus target non-default initializable components", () => {
    const world = new Fiecs.World();

    const relationship = world.tag("some relationship");
    relationship.add(world.builtin.RelationshipHasNoData);

    const e = world.entity();
    const target = world.component(z.string());

    expect(() => e.add(relationship, target)).not.toThrow();
  });
});

describe("Trait trait", () => {
  test("Trait is a Trait", () => {
    const world = new Fiecs.World();
    expect(world.builtin.Trait.has(world.builtin.Trait)).toBe(true);
  });

  test("A trait-relationship can not be added to a component that is already used (throws)", () => {
    const world = new Fiecs.World();
    const someComponent = world.tag();
    const someTarget = world.tag("some target");

    const someTrait = world.tag("some trait");
    someTrait.add(world.builtin.Trait);

    const e = world.entity("Peter Parker");
    e.add(someComponent);

    expect(() => {
      someComponent.add(someTrait);
    }).toThrow(
      'Component "some trait" is a Trait and cannot be added to a component that is already in use!',
    );
    expect(() => {
      someComponent.add(someTrait, someTarget);
    }).toThrow(
      'Component "(some trait, some target)" is a Trait and cannot be added to a component that is already in use!',
    );

    expect(() => {
      someComponent.add(someTarget, someTrait);
    }).toThrow(
      'Component "(some target, some trait)" is a Trait and cannot be added to a component that is already in use!',
    );
  });

  test("A trait-relationship can not be added to a component that is already used as relationship (throws)", () => {
    const world = new Fiecs.World();
    const someComponent = world.tag();
    const someTarget = world.tag("some target");

    const someTrait = world.tag("some trait");
    someTrait.add(world.builtin.Trait);

    const e = world.entity("Peter Parker");
    e.add(someComponent, someTarget);

    expect(() => {
      someComponent.add(someTrait, someTarget);
    }).toThrow(
      'Component "(some trait, some target)" is a Trait and cannot be added to a component that is already in use!',
    );
  });
});

describe("Acyclic trait", () => {
  test("Acyclic is a Trait", () => {
    const world = new Fiecs.World();

    expect(world.builtin.Acyclic.has(world.builtin.Trait)).toBe(true);
  });

  test("An acyclic relationship cannot target the entity it is added to", () => {
    const world = new Fiecs.World();
    const e = world.tag();

    const acyclicRelationship = world.tag("acyclicRelationship");
    acyclicRelationship.add(world.builtin.Acyclic);

    expect(() => {
      e.add(acyclicRelationship, e);
    }).toThrow(
      'Relationship "acyclicRelationship" is acyclic and cannot target the entity it is added to',
    );
  });

  test("An acyclic relationships cannot be added to a component that would create a direct cycle", () => {
    const world = new Fiecs.World();
    const e = world.tag();
    const target = world.tag();

    const acyclicRelationship = world.tag("acyclicRelationship");
    acyclicRelationship.add(world.builtin.Acyclic);

    e.add(acyclicRelationship, target);

    expect(() => {
      target.add(acyclicRelationship, e);
    }).toThrow(
      'Relationship "acyclicRelationship" is acyclic and cannot be added to an entity that would create a cycle',
    );
  });

  test("An acyclic relationship cannot be added to a component that would create an indirect cycle", () => {
    const world = new Fiecs.World();
    const power = world.tag();
    const responsibility = world.tag();
    const stress = world.tag();

    const acyclicRelationship = world.tag("acyclicRelationship");
    acyclicRelationship.add(world.builtin.Acyclic);

    power.add(acyclicRelationship, responsibility);
    responsibility.add(acyclicRelationship, stress);

    expect(() => {
      stress.add(acyclicRelationship, power);
    }).toThrow(
      'Relationship "acyclicRelationship" is acyclic and cannot be added to an entity that would create a cycle',
    );
  });
});

describe("Singleton trait", () => {
  test("Singleton is a Trait", () => {
    const world = new Fiecs.World();
    expect(world.builtin.Singleton.has(world.builtin.Trait)).toBe(true);
  });

  test("Singletons throw if trying to set on an entity", () => {
    const world = new Fiecs.World();

    const singletonComponent = world.component(z.string());
    singletonComponent.setName("singleton component");
    singletonComponent.add(world.builtin.Singleton);

    const e = world.entity();

    expect(() => {
      e.set(singletonComponent, "some value");
    }).toThrow(
      'Component "singleton component" is a singleton and cannot be added to entities other than itself',
    );
  });

  test("Singletons throw if trying to add to an entity", () => {
    const world = new Fiecs.World();

    const singletonComponent = world.component(z.string().default(""));
    singletonComponent.setName("singleton component");
    singletonComponent.add(world.builtin.Singleton);

    const e = world.entity();

    expect(() => {
      e.add(singletonComponent);
    }).toThrow(
      'Component "singleton component" is a singleton and cannot be added to entities other than itself',
    );
  });

  test("Singletons don't throw if trying to set on the component itself", () => {
    const world = new Fiecs.World();

    const singletonComponent = world.component(z.string());
    singletonComponent.setName("singleton component");
    singletonComponent.add(world.builtin.Singleton);

    expect(() => {
      singletonComponent.set(singletonComponent, "some value");
    }).not.toThrow();
  });

  test("When setting a component on the world world itself, it automatically becomes a singleton", () => {
    const world = new Fiecs.World();

    const singletonComponent = world.component(z.string());

    world.set(singletonComponent, "some value");

    expect(singletonComponent.has(world.builtin.Singleton)).toBe(true);
  });
});

describe("Symmetric trait", () => {
  test("Symmetric is a Trait", () => {
    const world = new Fiecs.World();
    expect(world.builtin.Symmetric.has(world.builtin.Trait)).toBe(true);
  });

  test("A relationship marked as Symmetric automatically creates the inverse relationship", () => {
    const world = new Fiecs.World();
    const friendOf = world.tag("friend of");
    friendOf.add(world.builtin.Symmetric);

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");

    alice.add(friendOf, bob);

    expect(alice.has(friendOf, bob)).toBe(true);
    expect(bob.has(friendOf, alice)).toBe(true);
  });

  test("A relationship marked as Symmetric automatically removes the inverse relationship when removed", () => {
    const world = new Fiecs.World();
    const friendOf = world.tag("friend of");
    friendOf.add(world.builtin.Symmetric);
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    alice.add(friendOf, bob);

    alice.remove(friendOf, bob);

    expect(alice.has(friendOf, bob)).toBe(false);
    expect(bob.has(friendOf, alice)).toBe(false);
  });

  test("When Symmetric is removed from a relationship, it no longer adds the inverse when added", () => {
    const world = new Fiecs.World();
    const friendOf = world.tag("friend of");
    friendOf.add(world.builtin.Symmetric);

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(friendOf, bob);
    friendOf.remove(world.builtin.Symmetric);
    alice.add(friendOf, clint);

    expect(alice.has(friendOf, bob)).toBe(true);
    expect(bob.has(friendOf, alice)).toBe(true);
    expect(alice.has(friendOf, clint)).toBe(true);
    expect(clint.has(friendOf, alice)).toBe(false);
  });

  //TODO[epic=atomic operations] When the other half of a symmetric relationship cannot be added, neither should the first
});

describe("Target trait", () => {
  test("Target is a trait", () => {
    const world = new Fiecs.World();
    expect(world.builtin.Target.has(world.builtin.Trait)).toBe(true);
  });

  test("An entity marked as Target can be used as target of a relationship", () => {
    const world = new Fiecs.World();

    const e = world.entity();
    const target = world.entity();
    target.add(world.builtin.Target);
    const r = world.tag();

    expect(() => {
      e.add(r, target);
    }).not.toThrow();
  });

  test("An entity marked as Target can NOT be used as a relationship", () => {
    const world = new Fiecs.World();

    const e = world.entity();
    const target = world.entity("marked target");
    target.add(world.builtin.Target);
    const r = world.tag();

    expect(() => {
      e.add(target, r);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a relationship',
    );
  });

  test("An entity marked as Target can NOT be used as component", () => {
    const world = new Fiecs.World();

    const e = world.entity();
    const target = world.entity("marked target");
    target.add(world.builtin.Target);

    expect(() => {
      e.add(target);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a component',
    );
  });
});

describe("TargetMustBeDefaultInitializable trait", () => {
  test("TargetMustBeDefaultInitializable is a trait", () => {
    const world = new Fiecs.World();
    expect(
      world.builtin.TargetMustBeDefaultInitializable.has(world.builtin.Trait),
    ).toBe(true);
  });

  test("A relationship marked as TargetMustBeDefaultInitializable cannot be used with a component that cannot be default initialized", () => {
    const world = new Fiecs.World();
    const entity = world.entity();
    const nonDefaultInitializable = world.component(z.string());
    nonDefaultInitializable.setName("non default initializable");

    const r = world.tag("some relationship");
    r.add(world.builtin.RelationshipHasNoData);
    r.add(world.builtin.TargetMustBeDefaultInitializable);

    expect(() => entity.add(r, nonDefaultInitializable)).toThrow(
      'Relationship "some relationship" is marked as TargetMustBeDefaultInitializable while target "non default initializable" has data and is not default initializable',
    );
  });
});

describe("Exclusive Trait", () => {
  test("Exclusive is a Trait", () => {
    const world = new Fiecs.World();
    expect(world.builtin.Exclusive.has(world.builtin.Trait)).toBe(true);
  });

  test("If an exclusive relationship is added to an entity with a different target, the target is replaced, not added", () => {
    const world = new Fiecs.World();
    const isOnPlanet = world.tag("is on planet");
    isOnPlanet.add(world.builtin.Exclusive);

    const earth = world.entity("Earth");
    const mars = world.entity("Mars");

    const alice = world.entity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(isOnPlanet, mars);

    expect(alice.has(isOnPlanet, earth)).toBe(false);
    expect(alice.has(isOnPlanet, mars)).toBe(true);
  });

  test("on Exclusive replacement, data of former is also replaced", () => {
    const world = new Fiecs.World();
    const isOnPlanet = world.component(z.number().default(0));
    isOnPlanet.add(world.builtin.Exclusive);

    const earth = world.entity("Earth");
    const mars = world.entity("Mars");

    const alice = world.entity("Alice");

    alice.set(isOnPlanet, earth, 100);
    alice.set(isOnPlanet, mars, 200);

    expect(alice.get(isOnPlanet, earth)).toBeUndefined();
    expect(alice.get(isOnPlanet, mars)).toBe(200);
  });

  test("If an exclusive relationship which also has With's is replaced, the Withs are also replaced", () => {
    const world = new Fiecs.World();

    const isOnPlanet = world.tag("is on planet");
    isOnPlanet.add(world.builtin.Exclusive);

    const hasAtmosphere = world.tag("has atmosphere");
    isOnPlanet.add(world.builtin.With, hasAtmosphere);

    const likesCurrentPlanet = world.tag("likes current planet");
    isOnPlanet.add(world.builtin.With, likesCurrentPlanet);

    const earth = world.entity("Earth");
    const mars = world.entity("Mars");

    const alice = world.entity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(isOnPlanet, mars);

    expect(alice.has(hasAtmosphere, mars)).toBe(true);
    expect(alice.has(likesCurrentPlanet, mars)).toBe(true);
    expect(alice.has(hasAtmosphere, earth)).toBe(false);
    expect(alice.has(likesCurrentPlanet, earth)).toBe(false);
  });

  test("When an exclusive relationship is added, but the replacement cannot be added, there should not be a remove", () => {
    const world = new Fiecs.World();
    const isOnPlanet = world.tag("is on planet");
    isOnPlanet.add(world.builtin.Exclusive);
    isOnPlanet.add(world.builtin.TargetMustBeDefaultInitializable);

    const earth = world.entity("Earth");
    const mars = world.component(z.string());

    const alice = world.entity("Alice");

    alice.add(isOnPlanet, earth);

    expect(() => {
      alice.add(isOnPlanet, mars);
    }).toThrow();

    expect(alice.has(isOnPlanet, earth)).toBe(true);
    expect(alice.has(isOnPlanet, mars)).toBe(false);
  });

  test("Replacing an exclusive relationship happens with a single archetype move, and one archetype link being created, even under complex circumstances", () => {
    const world = new Fiecs.World();
    const isOnPlanet = world.tag("is on planet");
    isOnPlanet.add(world.builtin.Exclusive);

    const hasAtmosphere = world.tag("has atmosphere");
    isOnPlanet.add(world.builtin.With, hasAtmosphere);

    const likesCurrentPlanet = world.tag("likes current planet");
    isOnPlanet.add(world.builtin.With, likesCurrentPlanet);

    const someOtherTag = world.tag("some other tag");

    const earth = world.entity("Earth");
    const mars = world.entity("Mars");

    const alice = world.entity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(someOtherTag); // this matters, because this way the archetype for just removing (isOnPlanet, earth) doesn't exist

    world.startStatistics();
    alice.add(isOnPlanet, mars);

    expect(world.getStatistics().archetypesAdded).toBe(1);
    expect(world.getStatistics().linksAdded).toBe(1);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  // test("If an exclusive relationship which also has With's is replaced, the data of the Withs are also replaced", () => {});

  // test("If an exclusive relationship is also Symmetric, the replacement also replaces on the two symmetry targets", () => {

  // });

  //TODO[epic=atomic operations] Exclusive replacements should happen with a single archetype move, and establish a single archetype link, not multiple moves and links
  //TODO[epic=atomic operations] If an exclusive relationship is target of a With, adding it should work correctly
});

describe("CanToggle Trait", () => {
  //TODO[epic=queries] - CanToggle trait
});
describe("Reflexive Trait", () => {
  //TODO[epic=queries] - Reflexive trait
});
describe("Transitive Trait", () => {
  //TODO[epic=queries] - Transitive Trait
});

describe("Traversable Trait", () => {
  //TODO[epic=queries] - Traversable trait
});

describe("OneOf Trait", () => {
  //TODO[epic=hierarchies] - OneOf Trait
});

describe("Final Trait", () => {
  //TODO[epic=Inheritance] - Final Trait
});
describe("Inheritable Trait", () => {
  //TODO[epic=Inheritance] - Inheritable Trait
});
describe("OnInstantiate Trait", () => {
  //TODO[epic=Inheritance] - OnInstantiate Trait
});
