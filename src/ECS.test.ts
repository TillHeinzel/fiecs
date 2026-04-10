import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";

import {
  ComponentHandle,
  ECS,
  EntityHandle,
  RelationshipTagHandle,
} from "./ECS";

describe("entities, names, aliveness", () => {
  test("default constructor", () => {
    const ecs = new ECS();

    expect(ecs).toBeInstanceOf(ECS);
  });

  test("create new entity", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();

    expect(e).toBeInstanceOf(EntityHandle);
  });

  test("create new entity with name", () => {
    const ecs = new ECS();
    const e = ecs.createNamedEntity("Bob");

    expect(e.getName()).toBe("Bob");
  });

  test("fail to create new entity with existing name", () => {
    const ecs = new ECS();
    ecs.createNamedEntity("Bob");

    expect(() => ecs.createNamedEntity("Bob")).toThrow();
  });

  test("lookup nonexistent name is undefined", () => {
    const ecs = new ECS();

    expect(ecs.lookupEntity("Bob")).toBeUndefined();
  });

  test("setting name to an already existing name throws", () => {
    const ecs = new ECS();
    ecs.createNamedEntity("Bob");
    const e2 = ecs.createEntity();

    expect(() => e2.setName("Bob")).toThrow();
  });

  test("changing name means old name can no longer be used to lookup the entity", () => {
    const ecs = new ECS();
    const e = ecs.createNamedEntity("Bob");
    expect(e.getName()).toBe("Bob");
    expect(ecs.lookupEntity("Bob")).toBeInstanceOf(EntityHandle);

    e.setName("Alice");

    expect(e.getName()).toBe("Alice");
    expect(ecs.lookupEntity("Bob")).toBeUndefined();
    expect(ecs.lookupEntity("Alice")).toBeInstanceOf(EntityHandle);
    expect(ecs.lookupEntity("Alice")!.getName()).toBe("Alice");
  });

  test("multiple entity objects target the same underlying data", () => {
    const ecs = new ECS();

    const e1 = ecs.createNamedEntity("Bob");

    expect(e1.getName()).toBe("Bob");

    const e2 = ecs.lookupEntity("Bob");

    expect(e1).not.toBe(e2);
    expect(e1.isSameEntityAs(e2!)).toBe(true);

    expect(e2).toBeInstanceOf(EntityHandle);
    expect(e2?.getName()).toBe("Bob");

    e1.setName("Alice");

    expect(e1.getName()).toBe("Alice");
    expect(e2!.getName()).toBe("Alice");
  });

  test("new entities are alive", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();

    expect(e.isAlive()).toBe(true);
  });

  test("destructed entities are not alive", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    e.destruct();

    expect(e.isAlive()).toBe(false);
  });

  test("destructed entities cannot be looked up", () => {
    const ecs = new ECS();
    const e = ecs.createNamedEntity("Bob");
    e.destruct();

    expect(ecs.lookupEntity("Bob")).toBeUndefined();
  });

  test("destructed entities have no name", () => {
    const ecs = new ECS();

    const e = ecs.createNamedEntity("Bob");
    e.destruct();
    expect(e.getName()).toBeUndefined();
  });

  test("destructing an entity removes all its tags", () => {
    const ecs = new ECS();
    const playerTag = ecs.createTag();
    const aiTag = ecs.createTag();
    const e = ecs.createEntity();
    e.add(playerTag);
    e.add(aiTag);

    e.destruct();

    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("destructing an entity removes all its components", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number());
    const mana = ecs.createComponent(z.number());
    e.set(health, 100);
    e.set(mana, 50);

    e.destruct();

    expect(e.has(health)).toBe(false);
    expect(e.has(mana)).toBe(false);
    expect(e.get(health)).toBeUndefined();
    expect(e.get(mana)).toBeUndefined();
  });

  test("destructing an entity removes all its relationship tags", () => {
    const ecs = new ECS();

    const eats = ecs.createTag();

    const apples = ecs.createEntity();
    const pears = ecs.createEntity();

    const bob = ecs.createEntity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);

    bob.destruct();

    expect(bob.has(eats, apples)).toBe(false);
    expect(bob.has(eats, pears)).toBe(false);
  });

  describe("removeFromAll", () => {
    test("removeFromAll removes the removed entity from all that have added it, but not as parts of relationships", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      alice.add(likes);
      bob.add(likes);
      bob.add(alice, likes);
      clint.add(likes);
      clint.add(likes, alice);

      ecs.removeFromAll(likes);

      expect(likes.isAlive()).toBe(true);

      expect(alice.has(likes)).toBe(false);
      expect(bob.has(likes)).toBe(false);
      expect(clint.has(likes)).toBe(false);
      expect(clint.has(likes, alice)).toBe(true);
      expect(bob.has(alice, likes)).toBe(true);
    });

    test("removeFromAll works for relationships", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      alice.add(likes);
      bob.add(likes);
      bob.add(alice, likes);
      clint.add(likes);
      clint.add(likes, alice);

      ecs.removeFromAll(likes, alice);

      expect(likes.isAlive()).toBe(true);

      expect(alice.has(likes)).toBe(true);
      expect(bob.has(likes)).toBe(true);
      expect(clint.has(likes)).toBe(true);
      expect(clint.has(likes, alice)).toBe(false);
      expect(bob.has(alice, likes)).toBe(true);
    });

    test("removeFromAll works for explicit relationships", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      const likesAlice = ecs.createRelationshipTag(likes, alice);

      alice.add(likes);
      bob.add(likes);
      bob.add(alice, likes);
      clint.add(likes);
      clint.add(likes, alice);

      ecs.removeFromAll(likesAlice);

      expect(likes.isAlive()).toBe(true);

      expect(alice.has(likes)).toBe(true);
      expect(bob.has(likes)).toBe(true);
      expect(clint.has(likes)).toBe(true);
      expect(clint.has(likes, alice)).toBe(false);
      expect(bob.has(alice, likes)).toBe(true);
    });

    test("removeFromAll throws if we try to removeFromAll with two parameters where the first is already a relationship", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      const likesAlice = ecs.createRelationshipTag(likes, alice);

      alice.add(likes);
      bob.add(likes);
      bob.add(alice, likes);
      clint.add(likes);
      clint.add(likes, alice);

      // @ts-expect-error //should throw because overload is not acceptable
      expect(() => ecs.removeFromAll(likesAlice, alice)).toThrow();
    });

    test("removeFromAll removes any associated component data", () => {
      const ecs = new ECS();
      const likes = ecs.createComponent(z.number().default(0));
      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      alice.add(likes);
      bob.add(likes);
      bob.add(alice, likes);
      clint.add(likes);
      clint.add(likes, alice);

      ecs.removeFromAll(likes);

      expect(likes.isAlive()).toBe(true);

      expect(alice.get(likes)).toBeUndefined();
      expect(bob.get(likes)).toBeUndefined();
      expect(clint.get(likes)).toBeUndefined();
      expect(clint.get(likes, alice)).toBe(0);
      expect(bob.get(alice, likes)).toBe(0);
    });
  });

  describe("destructAllWith", () => {
    test("destructAllWith deletes all entities with a tag, but not those that have the tag as part of a relationship", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const apples = ecs.createEntity();

      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      alice.add(likes);
      bob.add(apples, likes);
      clint.add(likes, apples);

      ecs.destructAllWith(likes);

      expect(alice.isAlive()).toBe(false);
      expect(bob.isAlive()).toBe(true);
      expect(clint.isAlive()).toBe(true);
      expect(bob.has(apples, likes)).toBe(true);
      expect(clint.has(likes, apples)).toBe(true);
    });

    test("destructAllWith works for relationships", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const apples = ecs.createEntity();

      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      alice.add(likes);
      bob.add(apples, likes);
      clint.add(likes, apples);

      ecs.destructAllWith(likes, apples);

      expect(alice.isAlive()).toBe(true);
      expect(bob.isAlive()).toBe(true);
      expect(clint.isAlive()).toBe(false);
      expect(bob.has(apples, likes)).toBe(true);
    });

    test("destructAllWith works for explicit relationships", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const apples = ecs.createEntity();

      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      const likesApples = ecs.createRelationshipTag(likes, apples);

      alice.add(likes);
      bob.add(apples, likes);
      clint.add(likes, apples);

      ecs.destructAllWith(likesApples);

      expect(alice.isAlive()).toBe(true);
      expect(bob.isAlive()).toBe(true);
      expect(clint.isAlive()).toBe(false);
      expect(bob.has(apples, likes)).toBe(true);
    });

    test("destructAllWith throws if we try to destructAllWith with two parameters where the first is already a relationship", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const apples = ecs.createEntity();

      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      const likesApples = ecs.createRelationshipTag(likes, apples);

      alice.add(likes);
      bob.add(apples, likes);
      clint.add(likes, apples);

      // @ts-expect-error //should throw because overload is not acceptable
      expect(() => ecs.destructAllWith(likesApples, alice)).toThrow(
        "Cannot destructAllWith with a relationship and another entity",
      );
    });

    test("destructAllWith removes associated archetypes and edges", () => {
      const ecs = new ECS();
      const likes = ecs.createTag("likes");
      const apples = ecs.createEntity();

      const alice = ecs.createNamedEntity("Alice");
      const bob = ecs.createNamedEntity("Bob");
      const clint = ecs.createNamedEntity("Clint");

      alice.add(likes);
      bob.add(apples, likes);
      clint.add(likes, apples);
      clint.add(likes);

      const formerArchetypeCount = ecs.getArchetypeCount();
      const formerEdgeCount = ecs.getArchetypeGraphEdgeCount();

      ecs.destructAllWith(likes);

      // remove [likes], [likes, (likes, apples)]
      expect(ecs.getArchetypeCount()).toBe(formerArchetypeCount - 2);
      // removes edges from [] to [likes], from [(likes, apples)] to [likes, (likes, apples)]
      expect(ecs.getArchetypeGraphEdgeCount()).toBe(formerEdgeCount - 4);
    });
  });
});

describe("tags", () => {
  test("Creating a tag returns an EntityHandle object, as tags are just entities", () => {
    const ecs = new ECS();
    const c = ecs.createTag();

    expect(c).toBeInstanceOf(EntityHandle);
  });

  test("A tag can be created with a name", () => {
    const ecs = new ECS();
    const player = ecs.createTag("Player");

    expect(player.getName()).toBe("Player");
  });

  test("setting a tag requires it being created first", () => {
    const ecs = new ECS();
    const tag = ecs.createTag();
    const e = ecs.createEntity();
    expect(() => e.add(tag)).not.toThrow();

    const otherEcs = new ECS();
    const deviantTag = otherEcs.createTag();
    expect(() => e.add(deviantTag)).toThrow("Component does not exist in ECS");
  });

  test("adding a tag to an entity will show that it has that tag", () => {
    const ecs = new ECS();
    const playerTag = ecs.createTag();
    const e = ecs.createEntity();
    e.add(playerTag);

    expect(e.has(playerTag)).toBe(true);
    const aiTag = ecs.createTag();
    expect(e.has(aiTag)).toBe(false);
  });

  test("removing a tag from an entity will show that it no longer has that tag", () => {
    const ecs = new ECS();
    const playerTag = ecs.createTag();
    const e = ecs.createEntity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);

    e.remove(playerTag);
    expect(e.has(playerTag)).toBe(false);
  });

  test("adding a tag twice changes nothing", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const playerTag = ecs.createTag();
    const aiTag = ecs.createTag();
    const e = ecs.createEntity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(false);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("removing tag the entity does not have does nothing", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const playerTag = ecs.createTag();
    const aiTag = ecs.createTag();
    const e = ecs.createEntity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    e.remove(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("clear removes all tags from the component", () => {
    const ecs = new ECS();
    const playerTag = ecs.createTag();
    const aiTag = ecs.createTag();
    const e = ecs.createEntity();
    e.add(playerTag);
    e.add(aiTag);
    e.clear();

    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("Destructing a tag shows the tag to be nonalive", () => {
    const ecs = new ECS();

    const likes = ecs.createTag("likes");
    expect(likes.isAlive()).toBe(true);

    likes.destruct();

    expect(likes.isAlive()).toBe(false);
  });

  test("trying to add a destructed tag to an entity throws", () => {
    const ecs = new ECS();
    const likes = ecs.createTag();
    const bob = ecs.createNamedEntity("Bob");
    likes.destruct();
    expect(() => bob.add(likes)).toThrow("Component does not exist in ECS");
  });

  test("adding a tag to two entities with the same original archetype only requires one expensive lookup ", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const playerTag = ecs.createTag();
    const e1 = ecs.createEntity();
    const e2 = ecs.createEntity();
    expect(ecs.getStatistics()!.expensiveLookups).toBe(0);
    e1.add(playerTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
    e2.add(playerTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("removing a tag does not require additional expensive lookups, because links are created when the tag is added", () => {
    const ecs = new ECS();
    ecs.startStatistics();

    const playerTag = ecs.createTag();
    const e1 = ecs.createEntity();

    e1.add(playerTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    e1.remove(playerTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("when adding two tags and then removing the first, each operation adds a link", () => {
    const ecs = new ECS();
    ecs.startStatistics();

    const playerTag = ecs.createTag();
    const aiTag = ecs.createTag();
    const e1 = ecs.createEntity();

    e1.add(playerTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    e1.add(aiTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(2);

    e1.remove(playerTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(3);
  });

  test("entities can be used as tags on other entities, as tags are just entities", () => {
    const ecs = new ECS();
    const bob = ecs.createNamedEntity("Bob");
    const alice = ecs.createNamedEntity("Alice");
    alice.add(bob);

    expect(alice.has(bob)).toBe(true);
  });

  test("Trying to set data on a tag throws", () => {
    const ecs = new ECS();
    const tag = ecs.createTag();
    const e = ecs.createEntity();
    // @ts-expect-error // should not be allowed in ts, but needs to be tested
    expect(() => e.set(tag, 5)).toThrow("Invalid arguments for setData");
  });
});

describe("statistics", () => {
  test("if statistics is started, can fetch statistics", () => {
    const ecs = new ECS();

    ecs.startStatistics();

    expect(ecs.getStatistics()).toBeDefined();
  });
  test("if statistics is not started, can't fetch statistics", () => {
    const ecs = new ECS();

    expect(ecs.getStatistics()).not.toBeDefined();
  });

  test("if statistics is started then stopped, can't fetch statistics", () => {
    const ecs = new ECS();

    ecs.startStatistics();
    ecs.stopStatistics();

    expect(ecs.getStatistics()).not.toBeDefined();
  });

  test("if statistics is started, expensive archetype lookups are counted", () => {
    const ecs = new ECS();
    const cheeseTag = ecs.createTag();
    ecs.startStatistics();

    const e = ecs.createEntity();
    e.add(cheeseTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
    const breadTag = ecs.createTag();
    e.add(breadTag);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(2);
  });

  test("can lookup archetype count", () => {
    const ecs = new ECS();
    const initialArchetypeCount = ecs.getArchetypeCount();
    const cheese = ecs.createTag();

    const e = ecs.createEntity();
    e.add(cheese);
    expect(ecs.getArchetypeCount()).toEqual(initialArchetypeCount + 1);

    e.add(cheese, e);
    expect(ecs.getArchetypeCount()).toEqual(initialArchetypeCount + 2);
  });

  test("can lookup number of edges between archetypes", () => {
    const ecs = new ECS();
    const cheese = ecs.createTag();
    const e = ecs.createEntity();

    const initialEdgeCount = ecs.getArchetypeGraphEdgeCount();

    e.add(cheese);
    expect(ecs.getArchetypeGraphEdgeCount()).toEqual(initialEdgeCount + 2);

    e.add(cheese, e);
    expect(ecs.getArchetypeGraphEdgeCount()).toEqual(initialEdgeCount + 4);

    e.remove(cheese);
    expect(ecs.getArchetypeGraphEdgeCount()).toEqual(initialEdgeCount + 6);

    e.remove(cheese, e);
    expect(ecs.getArchetypeGraphEdgeCount()).toEqual(initialEdgeCount + 8);
  });
});

describe("components", () => {
  test("Creating a component returns a ComponentHandle object", () => {
    const ecs = new ECS();
    const c = ecs.createComponent(z.number());

    expect(c).toBeInstanceOf(ComponentHandle);
  });

  test("adding a component requires it being created first", () => {
    const ecs = new ECS();
    const c = ecs.createComponent(z.number().default(0));
    const e = ecs.createEntity();
    expect(() => e.add(c)).not.toThrow();

    const otherEcs = new ECS();
    const deviantComponent = otherEcs.createComponent(z.number().default(0));

    expect(() => e.add(deviantComponent)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("adding a component means that component can be gotten back", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number().default(0));

    e.add(health);
    expect(e.get(health)).toBe(0);
  });

  test("getting a non-existent component returns undefined", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number());
    expect(e.get(health)).toBeUndefined();
  });

  test("components are independent of each other", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number());
    const mana = ecs.createComponent(z.number());
    e.set(health, 100);
    e.set(mana, 50);
    expect(e.get(health)).toBe(100);
    expect(e.get(mana)).toBe(50);
  });

  test("a component that has been added can be checked for existence", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number().default(0));
    e.add(health);
    expect(e.has(health)).toBe(true);
  });

  test("removing a component means that component can no longer be gotten or checked for existence", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number().default(0));
    e.add(health);
    expect(e.has(health)).toBe(true);
    e.remove(health);
    expect(e.has(health)).toBe(false);
    expect(e.get(health)).toBeUndefined();
  });

  test("If a component doesn't have a default, add throws", () => {
    const ecs = new ECS();
    const health = ecs.createComponent(z.number());
    health.setName("health");
    const e = ecs.createEntity();
    expect(() => e.add(health)).toThrow(
      'Component "health" cannot be default initialized and thus not be used in add',
    );
  });

  test("A components value can be set, and the updated value can be get", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number().default(0));
    e.add(health);
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("setting a component automatically adds it", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number().default(0));
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("set allows a component to have no default value", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number());
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("Setting a component with a bad type throws an error", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number());
    // @ts-expect-error // this should throw because "not a number" is not a number
    expect(() => e.set(health, "not a number")).toThrow(
      "Invalid component data",
    );
  });

  test("Setting a component which doesn't fulfill the schema throws an error", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number().min(0).max(100));
    expect(() => e.set(health, -1)).toThrow("Invalid component data");
    expect(() => e.set(health, 101)).toThrow("Invalid component data");
  });

  test("Adding a component to an entity that already has it does nothing", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const health = ecs.createComponent(z.number().default(100));
    const e = ecs.createEntity();
    e.set(health, 50);
    e.add(health);
    expect(e.get(health)).toBe(50);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("adding a component requires it being created first", () => {
    const ecs = new ECS();
    const c = ecs.createComponent(z.number().default(0));
    const e = ecs.createEntity();
    expect(() => e.add(c)).not.toThrow();

    const otherEcs = new ECS();
    const deviantComponent = otherEcs.createComponent(z.number().default(0));

    expect(() => e.add(deviantComponent)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("clearing an entity removes all components from the entity", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();
    const health = ecs.createComponent(z.number());
    const mana = ecs.createComponent(z.number());
    e.set(health, 100);
    e.set(mana, 50);
    e.clear();
    expect(e.has(health)).toBe(false);
    expect(e.has(mana)).toBe(false);
    expect(e.get(health)).toBeUndefined();
    expect(e.get(mana)).toBeUndefined();
  });

  test("adding a component to two entities with the same original archetype only requires one expensive lookup", () => {
    const ecs = new ECS();
    ecs.startStatistics();

    const health = ecs.createComponent(z.number());

    const e1 = ecs.createEntity();
    const e2 = ecs.createEntity();
    expect(ecs.getStatistics()!.expensiveLookups).toBe(0);
    e1.set(health, 100);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
    e2.set(health, 50);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("removing a component from an entity does not require and expensive lookup, because links are established on add", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const health = ecs.createComponent(z.number());
    const e1 = ecs.createEntity();
    e1.set(health, 100);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
    e1.remove(health);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("when adding two components and then removing the first, each operation adds a link", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const health = ecs.createComponent(z.number());
    const damage = ecs.createComponent(z.number());
    const e1 = ecs.createEntity();

    e1.set(health, 100);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    e1.set(damage, 50);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(2);

    e1.remove(health);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(3);
  });

  test("A component can be set to undefined", () => {
    const ecs = new ECS();
    const e = ecs.createEntity();

    const health = ecs.createComponent({ parse: (x: number | undefined) => x });
    e.set(health, 100);
    expect(e.get(health)).toBe(100);

    e.set(health, undefined);
    expect(e.get(health)).toBeUndefined();
  });

  //TODO[epic=basics] Deleting a component panics
});

describe("relationships", () => {
  test("adding a relationship tag requires a created Tag or Component", () => {
    const ecs = new ECS();
    const likes = ecs.createTag();
    const bob = ecs.createEntity();
    const apples = ecs.createEntity();
    expect(() => bob.add(likes, apples)).not.toThrow();

    const otherEcs = new ECS();
    const deviantRelationshipTag = otherEcs.createTag();
    expect(() => bob.add(deviantRelationshipTag, apples)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("adding a relationship tag to an entity will show that it has that relationship tag", () => {
    const ecs = new ECS();

    const eats = ecs.createTag();

    const apples = ecs.createEntity();
    const pears = ecs.createEntity();

    const bob = ecs.createEntity();
    bob.add(eats, apples);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
  });

  test("removing a relationship tag from an entity will show that it no longer has that relationship tag, without affecting other relationships", () => {
    const ecs = new ECS();

    const eats = ecs.createTag();
    const apples = ecs.createNamedEntity("apples");
    const pears = ecs.createNamedEntity("pears");
    const bob = ecs.createNamedEntity("bob");

    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);

    bob.remove(eats, apples);

    expect(bob.has(eats, apples)).toBe(false);
    expect(bob.has(eats, pears)).toBe(true);
  });

  test("adding a relationship tag twice does nothing quietly", () => {
    const ecs = new ECS();
    ecs.startStatistics();

    const eats = ecs.createTag();

    const apples = ecs.createEntity();
    const pears = ecs.createEntity();

    const bob = ecs.createEntity();
    bob.add(eats, apples);
    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    bob.add(eats, apples);
    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("removing non-existant relationship tag does nothing quietly", () => {
    const ecs = new ECS();
    ecs.startStatistics();

    const eats = ecs.createTag();
    const apples = ecs.createEntity();
    const pears = ecs.createEntity();
    const bob = ecs.createEntity();

    bob.add(eats, apples);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    bob.remove(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("clear removes all relationship tags from the entity", () => {
    const ecs = new ECS();

    const eats = ecs.createTag();

    const apples = ecs.createEntity();
    const pears = ecs.createEntity();

    const bob = ecs.createEntity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);

    bob.clear();

    expect(bob.has(eats, apples)).toBe(false);
    expect(bob.has(eats, pears)).toBe(false);
  });

  test("adding a relationship tag to an entity will show that it has any of that relationship tag", () => {
    const ecs = new ECS();

    const eats = ecs.createTag();

    const apples = ecs.createEntity();

    const bob = ecs.createEntity();
    bob.add(eats, apples);

    expect(bob.hasAnyRelationship(eats)).toBe(true);
  });

  test("removing the last of a relationship type will show that the entity no longer has that relationship tag", () => {
    const ecs = new ECS();

    const eats = ecs.createTag();

    const apples = ecs.createEntity();
    const pears = ecs.createEntity();

    const bob = ecs.createEntity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.hasAnyRelationship(eats)).toBe(true);

    bob.remove(eats, apples);

    expect(bob.hasAnyRelationship(eats)).toBe(true);

    bob.remove(eats, pears);

    expect(bob.hasAnyRelationship(eats)).toBe(false);
  });

  test("we can get the targets for a relationship tag on an entity", () => {
    const ecs = new ECS();
    const eats = ecs.createTag();
    const apples = ecs.createEntity();
    const pears = ecs.createEntity();
    const bob = ecs.createEntity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.getRelationshipTargets(eats)).toBeInstanceOf(Set);
    expect(bob.getRelationshipTargets(eats).size).toBe(2);
    expect([...bob.getRelationshipTargets(eats)]).toEqual([apples, pears]);
  });

  test("we can get the first added target for a relationship tag on an entity", () => {
    const ecs = new ECS();
    const eats = ecs.createTag();
    const apples = ecs.createEntity();
    const pears = ecs.createEntity();

    const bob = ecs.createEntity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.getARelationshipTarget(eats)!.isSameEntityAs(apples)).toBe(true);

    bob.remove(eats, apples);

    expect(bob.getARelationshipTarget(eats)!.isSameEntityAs(pears)).toBe(true);
  });

  test("adding a relationship tag to two entities with the same original archetype only requires one expensive lookup", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const relatesTo = ecs.createTag();
    const e1 = ecs.createEntity();
    const e2 = ecs.createEntity();
    const e3 = ecs.createEntity();
    expect(ecs.getStatistics()!.expensiveLookups).toBe(0);
    e1.add(relatesTo, e3);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
    e2.add(relatesTo, e3);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("removing a relationship tag from an entity requires no additional expensive lookups because links are established on add", () => {
    const ecs = new ECS();
    ecs.startStatistics();

    const likes = ecs.createTag();
    const bob = ecs.createEntity();
    const alice = ecs.createEntity();

    bob.add(likes, alice);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);

    bob.remove(likes, alice);
    expect(ecs.getStatistics()!.expensiveLookups).toBe(1);
  });

  test("Relationships can be components", () => {
    const ecs = new ECS();
    const eats = ecs.createComponent(z.number().default(0));
    const bob = ecs.createEntity();
    const apples = ecs.createEntity();
    bob.add(eats, apples);
    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.hasAnyRelationship(eats)).toBe(true);
    expect(bob.getRelationshipTargets(eats)).toEqual(new Set([apples]));
    expect(bob.getARelationshipTarget(eats)?.isSameEntityAs(apples)).toBe(true);
  });

  test("Added relationship components can be get like normal components", () => {
    const ecs = new ECS();
    const eats = ecs.createComponent(z.number().default(0));
    const bob = ecs.createEntity();
    const apples = ecs.createEntity();

    bob.add(eats, apples);
    expect(bob.get(eats, apples)).toBe(0);
  });

  test("Relationship components can be set and get like normal components", () => {
    const ecs = new ECS();
    const eats = ecs.createComponent(z.number().default(0));
    const bob = ecs.createEntity();
    const apples = ecs.createEntity();

    bob.set(eats, apples, 5);
    expect(bob.get(eats, apples)).toBe(5);
  });

  test("If the target for a tag-relationship is a component, it's data is used", () => {
    const ecs = new ECS();
    const eats = ecs.createComponent(z.number().default(0));
    const bob = ecs.createEntity();
    const apples = ecs.createEntity();

    bob.set(apples, eats, 5);
    expect(bob.get(apples, eats)).toBe(5);
  });

  test("If both the first and second parts of a relationship are components, the associated data belongs to the first one", () => {
    const ecs = new ECS();
    const eats = ecs.createComponent(z.number().default(0));
    const bob = ecs.createEntity();
    const apples = ecs.createComponent(z.string().default(""));

    bob.set(eats, apples, 5);
    expect(bob.get(eats, apples)).toBe(5);

    bob.set(apples, eats, "test");
    expect(bob.get(apples, eats)).toBe("test");
  });

  test("concrete relationships can be created on the the ecs and world like tags & components", () => {
    const ecs = new ECS();

    const likes = ecs.createTag();
    const bob = ecs.createEntity();
    const alice = ecs.createEntity();

    const bobLikesAlice = ecs.createRelationshipTag(likes, alice);

    expect(bobLikesAlice).toBeInstanceOf(RelationshipTagHandle);

    bob.add(bobLikesAlice);

    expect(bob.has(bobLikesAlice)).toBe(true);
    expect(bob.has(likes, alice)).toBe(true);
    expect(bob.hasAnyRelationship(likes)).toBe(true);
    expect(bob.getRelationshipTargets(likes)).toEqual(new Set([alice]));

    bob.remove(bobLikesAlice);

    expect(bob.has(bobLikesAlice)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);
    expect(bob.hasAnyRelationship(likes)).toBe(false);
    expect(bob.getRelationshipTargets(likes)).toEqual(new Set());

    const eats = ecs.createComponent(z.number().default(0));
    const apples = ecs.createEntity();

    const bobEatsApples = ecs.createRelationshipComponent(eats, apples);

    bob.set(bobEatsApples, 5);

    expect(bob.has(bobEatsApples)).toBe(true);
    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.hasAnyRelationship(eats)).toBe(true);
    expect(bob.getRelationshipTargets(eats)).toEqual(new Set([apples]));
    expect(bob.getARelationshipTarget(eats)?.isSameEntityAs(apples)).toBe(true);
    expect(bob.get(bobEatsApples)).toBe(5);
  });

  test("concrete relationships cannot be added as relationships of new pairs", () => {
    const ecs = new ECS();

    const likes = ecs.createTag();
    const bob = ecs.createEntity();
    const alice = ecs.createEntity();
    const clint = ecs.createEntity();

    const LikesAlice = ecs.createRelationshipTag(likes, alice);

    expect(LikesAlice).toBeInstanceOf(RelationshipTagHandle);

    // @ts-expect-error // should not be allowed in ts, but needs to be tested
    expect(() => bob.add(LikesAlice, clint)).toThrow(
      "Cannot use a concrete relationship as relationship for new pairs",
    );
  });

  test("Trying to create concrete relationships with components that have been deleted throws", () => {
    const ecs = new ECS();

    const eats = ecs.createTag();
    const apples = ecs.createEntity();

    eats.destruct();

    expect(() => ecs.createRelationshipTag(eats, apples)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("Trying to create concrete relationships with components that have been deleted throws", () => {
    const ecs = new ECS();

    const eats = ecs.createComponent(z.number().default(0));
    const apples = ecs.createEntity();

    eats.destruct();

    expect(() => ecs.createRelationshipComponent(eats, apples)).toThrow(
      "Component does not exist in ECS",
    );
  });
});

describe("Cleanup on destruct", () => {
  test("Destructing a tag removes the tag from all entities", () => {
    const ecs = new ECS();

    const cheese = ecs.createTag("cheese");
    const likes = ecs.createTag("likes");

    const alice = ecs.createNamedEntity("Alice");
    alice.add(likes);

    const bob = ecs.createNamedEntity("Bob");
    bob.add(likes);
    bob.add(cheese);

    const clint = ecs.createNamedEntity("Clint");
    clint.add(cheese);
    clint.add(likes);

    likes.destruct();

    expect(alice.has(likes)).toBe(false);
    expect(bob.has(likes)).toBe(false);
    expect(clint.has(likes)).toBe(false);
  });

  test("Destructing a tag removes all relationships that use the tag", () => {
    const ecs = new ECS();

    const cheese = ecs.createTag("cheese");
    const likes = ecs.createTag("likes");

    const alice = ecs.createNamedEntity("Alice");

    const bob = ecs.createNamedEntity("Bob");
    bob.add(cheese);
    bob.add(likes, alice);

    const clint = ecs.createNamedEntity("Clint");
    clint.add(likes, alice);
    clint.add(cheese);

    likes.destruct();

    expect(bob.has(likes, alice)).toBe(false);
    expect(clint.has(likes, alice)).toBe(false);

    expect(alice.hasAnyRelationship(likes)).toBe(false);
    expect(bob.hasAnyRelationship(likes)).toBe(false);
    expect(clint.hasAnyRelationship(likes)).toBe(false);
  });

  test("Destructing a tag that is used as both tag and relationship clears up both", () => {
    const ecs = new ECS();

    const likes = ecs.createTag("likes");

    const alice = ecs.createNamedEntity("Alice");
    alice.add(likes);

    const bob = ecs.createNamedEntity("Bob");
    bob.add(likes, alice);

    likes.destruct();

    expect(alice.has(likes)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);

    expect(alice.hasAnyRelationship(likes)).toBe(false);
    expect(bob.hasAnyRelationship(likes)).toBe(false);
  });

  test("Destructing a tag that is used as both tag and relationship on the same archetype clears up both", () => {
    const ecs = new ECS();

    const likes = ecs.createTag("likes");

    const alice = ecs.createNamedEntity("Alice");

    const bob = ecs.createNamedEntity("Bob");
    alice.add(likes);
    bob.add(likes, alice);

    likes.destruct();

    expect(bob.has(likes)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);

    expect(alice.hasAnyRelationship(likes)).toBe(false);
    expect(bob.hasAnyRelationship(likes)).toBe(false);
  });

  test("Destructing a tag removes all relationships that use the tag, even if there would be intermediate archetypes created", () => {
    const ecs = new ECS();

    const likes = ecs.createTag("likes");

    const alice = ecs.createNamedEntity("Alice");

    const bob = ecs.createNamedEntity("Bob");
    bob.add(likes);
    bob.add(likes, alice);

    // Archetypes that are there are [], [likes], [likes, (likes,alice)]
    // removing likes as tag first would create [(likes, alice)], which didn't exist before
    likes.destruct();

    expect(bob.has(likes)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);
  });

  test("Destructing a tag removes all archetypes and links using the tag", () => {
    const ecs = new ECS();

    const cheese = ecs.createTag("cheese");
    const likes = ecs.createTag("likes");

    const archetypes = ecs.getArchetypeCount();
    const edges = ecs.getArchetypeGraphEdgeCount();

    const alice = ecs.createNamedEntity("Alice");
    const bob = ecs.createNamedEntity("Bob");
    const clint = ecs.createNamedEntity("Clint");

    expect(ecs.getArchetypeCount()).toBe(archetypes);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges);

    alice.add(likes);
    expect(ecs.getArchetypeCount()).toBe(archetypes + 1);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges + 2);

    bob.add(likes);
    expect(ecs.getArchetypeCount()).toBe(archetypes + 1);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges + 2);

    bob.add(cheese);
    expect(ecs.getArchetypeCount()).toBe(archetypes + 2);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges + 4);

    bob.add(likes, alice);
    expect(ecs.getArchetypeCount()).toBe(archetypes + 3);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges + 6);

    clint.add(likes, alice);
    expect(ecs.getArchetypeCount()).toBe(archetypes + 4);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges + 8);

    clint.add(likes);
    expect(ecs.getArchetypeCount()).toBe(archetypes + 5);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges + 10);

    clint.add(cheese);
    expect(ecs.getArchetypeCount()).toBe(archetypes + 5);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges + 12);

    likes.destruct();

    expect(ecs.getArchetypeCount()).toBe(archetypes + 1); // everything built in and [cheese]
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(edges); // all links had likes
  });

  describe("Destructing an entity removes all relationships on other entities that target the destructed entity", () => {
    let likes: ComponentHandle<z.ZodDefault<z.ZodNumber>>;
    let bob: EntityHandle;
    let alice: EntityHandle;

    beforeEach(() => {
      const ecs = new ECS();
      likes = ecs.createComponent(z.number().default(0));

      bob = ecs.createNamedEntity("Bob");
      alice = ecs.createNamedEntity("Alice");

      bob.add(likes, alice);

      expect(bob.has(likes, alice)).toBe(true);

      alice.destruct();
    });

    test("", () => {
      expect(bob.has(likes, alice)).toBe(false);
    });
    test("", () => {
      expect(bob.hasAnyRelationship(likes)).toBe(false);
    });
    test("", () => {
      expect(bob.getRelationshipTargets(likes).size).toBe(0);
    });
    test("", () => {
      expect(bob.getARelationshipTarget(likes)).toBeUndefined();
    });
    test("including data", () => {
      expect(bob.get(likes, alice)).toBeUndefined();
    });
  });

  test("destructing a component removes it from all entities including data", () => {
    const ecs = new ECS();
    const health = ecs.createComponent(z.number().default(0));
    const alice = ecs.createNamedEntity("Alice");
    const bob = ecs.createNamedEntity("Bob");

    alice.set(health, 100);
    bob.set(health, 50);

    health.destruct();

    expect(alice.has(health)).toBe(false);
    expect(bob.has(health)).toBe(false);
    expect(alice.get(health)).toBeUndefined();
    expect(bob.get(health)).toBeUndefined();
  });

  test("Destructing an entity removes all archetypes and edges that previously had the entity as a target", () => {
    const ecs = new ECS();
    const likes = ecs.createTag();

    const doofus = ecs.createTag();

    const alice = ecs.createNamedEntity("Alice");
    const bob = ecs.createNamedEntity("Bob");
    const clint = ecs.createNamedEntity("Clint");

    bob.add(likes, alice);
    clint.add(doofus);
    clint.add(likes, alice);

    expect(bob.has(likes, alice)).toBe(true);
    expect(clint.has(likes, alice)).toBe(true);

    const previousArchetypeCount = ecs.getArchetypeCount();
    const previousEdgeCount = ecs.getArchetypeGraphEdgeCount();

    alice.destruct();

    expect(bob.has(likes, alice)).toBe(false);

    expect(ecs.getArchetypeCount()).toBe(previousArchetypeCount - 2);
    expect(ecs.getArchetypeGraphEdgeCount()).toBe(previousEdgeCount - 4);
  });

  //TODO[epic=hierarchies,seq=1] - Cleanup Traits: (OnDelete, Delete), (OnDeleteTarget, Delete), Panic for either
});

describe("With trait", () => {
  test("The ecs has a built-in component called with", () => {
    const ecs = new ECS();

    expect(ecs.builtin.With).toBeDefined();
    expect(ecs.builtin.With).toBeInstanceOf(EntityHandle);
  });

  test("With is a trait, a relationship, acyclic, cannot have data, and only works with targets that can be default initialized", () => {
    const ecs = new ECS();

    const withComponent = ecs.builtin.With;

    expect(withComponent.has(ecs.builtin.Trait)).toBe(true);
    expect(withComponent.has(ecs.builtin.Relationship)).toBe(true);
    expect(withComponent.has(ecs.builtin.Acyclic)).toBe(true);
    expect(withComponent.has(ecs.builtin.RelationshipHasNoData)).toBe(true);
    expect(
      withComponent.has(ecs.builtin.TargetMustBeDefaultInitializable),
    ).toBe(true);
  });

  test("Adding the with-trait to a component means that the withed-component will always be added automatically", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("With-trait works when adding implicitly", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.set(power, "amazing");

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("A component can have multiple With's", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const rogues = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(rogues)).toBe(true);
  });

  test("Withs can be chained", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const stress = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(stress)).toBe(true);
  });

  test("Withs can be chained multiple times", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const stress = ecs.createTag();
    const sadness = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);
    stress.add(ecs.builtin.With, sadness);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(stress)).toBe(true);
    expect(peterParker.has(sadness)).toBe(true);
  });

  test("chained Withs add no extra archetypes", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const stress = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    const archetypeCountBefore = ecs.getArchetypeCount();
    peterParker.add(power);

    expect(ecs.getArchetypeCount()).toBe(archetypeCountBefore + 1);
  });

  test("When with adds components with data, these are default initialized ", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createComponent(z.string().default("great"));
    const rogues = ecs.createComponent(z.string().default("lots"));

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.add(power);

    expect(peterParker.get(responsibility)).toBe("great");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("When with adds components with data, these are default initialized when implicitly added", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createComponent(z.string().default("great"));
    const rogues = ecs.createComponent(z.string().default("lots"));

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.set(power, "amazing");

    expect(peterParker.get(responsibility)).toBe("great");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("When with adds components with data, which are already on the entity, these are not modified ", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createComponent(z.string().default("great"));
    const rogues = ecs.createComponent(z.string().default("lots"));

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.set(responsibility, "huge");
    peterParker.add(power);

    expect(peterParker.get(responsibility)).toBe("huge");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("Removing a trait with a with does not remove the withed trait", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(power);

    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("Removing a trait added due to With also removes the trait that has the With", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
  });

  test("Removing a withed trait works recursively", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const stress = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    peterParker.add(power);
    peterParker.remove(stress);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(stress)).toBe(false);
  });

  test("Removing the middle of a with chain clears only the upstream", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const stress = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(stress)).toBe(true);
  });

  test("Removing a component due to its With being removed also clears out the data", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.get(power)).toBeUndefined();
  });

  test("A component that is target of With can be added and removed normally, if the With-relationship is not used", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createTag();
    power.add(ecs.builtin.With, responsibility);

    const peterPorker = ecs.createNamedEntity("Peter Porker");

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
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();

    const great = ecs.createNamedEntity("great");
    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power, great);

    expect(peterParker.has(power, great)).toBe(true);
    expect(peterParker.has(responsibility, great)).toBe(true);
  });

  test("Adding the with-trait to a relationship means that the withed-component will be added automatically with the same target on implicit add", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createTag();

    const great = ecs.createNamedEntity("great");
    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.set(power, great, "amazing");

    expect(peterParker.has(power, great)).toBe(true);
    expect(peterParker.has(responsibility, great)).toBe(true);
  });

  test("Removing a relationship added through with automatically removes the source-relationship", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();

    const great = ecs.createNamedEntity("great");
    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power, great);
    peterParker.remove(responsibility, great);

    expect(peterParker.has(power, great)).toBe(false);
    expect(peterParker.has(responsibility, great)).toBe(false);
  });

  test("Removing a component that has a With does not remove the withed component", () => {
    const ecs = new ECS();
    const power = ecs.createComponent(z.string().default("great"));
    const responsibility = ecs.createComponent(z.string().default("great"));

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(power);

    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("Removing a component that is added due to with by multiple origins also removes all the components withing it", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const money = ecs.createTag();
    const responsibility = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    money.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.add(money);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(money)).toBe(false);
  });

  test("Removing a component that is added due to with removes the one withing it, but not any other components withed by that original component", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const rogues = ecs.createTag();

    const peterParker = ecs.createNamedEntity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

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
    const ecs = new ECS();
    expect(ecs.builtin.Relationship.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A component marked as a Relationship cannot be added as a component", () => {
    const ecs = new ECS();
    const relationshipComponent = ecs.createTag("relationship component");
    relationshipComponent.add(ecs.builtin.Relationship);

    const e = ecs.createEntity();
    expect(() => e.add(relationshipComponent)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a component',
    );
  });

  test("A component marked as a Relationship cannot be added as a target in a relationship", () => {
    const ecs = new ECS();
    const markedRelationship = ecs.createTag("relationship component");
    markedRelationship.add(ecs.builtin.Relationship);

    const tag = ecs.createTag("some other relationship");

    const e = ecs.createEntity();
    expect(() => e.add(tag, markedRelationship)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a target of a relationship',
    );
  });

  test("A component marked as a Relationship CAN be added as a target in a relationship if the relationship is a Trait", () => {
    const ecs = new ECS();
    const markedRelationship = ecs.createTag("relationship component");
    markedRelationship.add(ecs.builtin.Relationship);

    const trait = ecs.createTag("some other relationship");
    trait.add(ecs.builtin.Trait);

    const e = ecs.createEntity();
    expect(() => e.add(trait, markedRelationship)).not.toThrow();
  });
});

describe("RelationshipHasNoData trait", () => {
  test("RelationshipHasNoData is a Trait", () => {
    const ecs = new ECS();
    expect(ecs.builtin.RelationshipHasNoData.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A relationship marked as RelationshipHasNoData cannot have data set on it", () => {
    const ecs = new ECS();

    const relationship = ecs.createTag("some relationship");
    relationship.add(ecs.builtin.RelationshipHasNoData);

    const e = ecs.createEntity();
    const target = ecs.createComponent(z.string());

    expect(() => e.set(relationship, target, "some data")).toThrow(
      'Relationship "some relationship" cannot have data',
    );
  });

  test("A relationship marked as RelationshipHasNoData cannot have data, so is not default initialized", () => {
    const ecs = new ECS();

    const relationship = ecs.createTag("some relationship");
    relationship.add(ecs.builtin.RelationshipHasNoData);

    const e = ecs.createEntity();
    const target = ecs.createComponent(z.string().default("default"));

    e.add(relationship, target);

    expect(e.get(relationship, target)).toBeUndefined();
  });

  test("A relationship marked as RelationshipHasNoData cannot have data can target non-default initializable components", () => {
    const ecs = new ECS();

    const relationship = ecs.createTag("some relationship");
    relationship.add(ecs.builtin.RelationshipHasNoData);

    const e = ecs.createEntity();
    const target = ecs.createComponent(z.string());

    expect(() => e.add(relationship, target)).not.toThrow();
  });
});

describe("Trait trait", () => {
  test("Trait is a Trait", () => {
    const ecs = new ECS();
    expect(ecs.builtin.Trait.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A trait-relationship can not be added to a component that is already used (throws)", () => {
    const ecs = new ECS();
    const someComponent = ecs.createTag();
    const someTarget = ecs.createTag();

    const someTrait = ecs.createTag("some trait");
    someTrait.add(ecs.builtin.Trait);

    const e = ecs.createNamedEntity("Peter Parker");
    e.add(someComponent);

    expect(() => {
      someComponent.add(someTrait, someTarget);
    }).toThrow(
      'Component "some trait" is a Trait and cannot be added to a component that is already in use!',
    );
  });
});

describe("Acyclic trait", () => {
  test("Acyclic is a Trait", () => {
    const ecs = new ECS();

    expect(ecs.builtin.Acyclic.has(ecs.builtin.Trait)).toBe(true);
  });

  test("An acyclic relationship cannot target the entity it is added to", () => {
    const ecs = new ECS();
    const e = ecs.createTag();

    const acyclicRelationship = ecs.createTag("acyclicRelationship");
    acyclicRelationship.add(ecs.builtin.Acyclic);

    expect(() => {
      e.add(acyclicRelationship, e);
    }).toThrow(
      'Relationship "acyclicRelationship" is acyclic and cannot target the entity it is added to',
    );
  });

  test("An acyclic relationships cannot be added to a component that would create a direct cycle", () => {
    const ecs = new ECS();
    const e = ecs.createTag();
    const target = ecs.createTag();

    const acyclicRelationship = ecs.createTag("acyclicRelationship");
    acyclicRelationship.add(ecs.builtin.Acyclic);

    e.add(acyclicRelationship, target);

    expect(() => {
      target.add(acyclicRelationship, e);
    }).toThrow(
      'Relationship "acyclicRelationship" is acyclic and cannot be added to an entity that would create a cycle',
    );
  });

  test("An acyclic relationship cannot be added to a component that would create an indirect cycle", () => {
    const ecs = new ECS();
    const power = ecs.createTag();
    const responsibility = ecs.createTag();
    const stress = ecs.createTag();

    const acyclicRelationship = ecs.createTag("acyclicRelationship");
    acyclicRelationship.add(ecs.builtin.Acyclic);

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
    const ecs = new ECS();
    expect(ecs.builtin.Singleton.has(ecs.builtin.Trait)).toBe(true);
  });

  test("Singletons throw if trying to set on an entity", () => {
    const ecs = new ECS();

    const singletonComponent = ecs.createComponent(z.string());
    singletonComponent.setName("singleton component");
    singletonComponent.add(ecs.builtin.Singleton);

    const e = ecs.createEntity();

    expect(() => {
      e.set(singletonComponent, "some value");
    }).toThrow(
      'Component "singleton component" is a singleton and cannot be added to entities other than itself',
    );
  });

  test("Singletons throw if trying to add to an entity", () => {
    const ecs = new ECS();

    const singletonComponent = ecs.createComponent(z.string().default(""));
    singletonComponent.setName("singleton component");
    singletonComponent.add(ecs.builtin.Singleton);

    const e = ecs.createEntity();

    expect(() => {
      e.add(singletonComponent);
    }).toThrow(
      'Component "singleton component" is a singleton and cannot be added to entities other than itself',
    );
  });

  test("Singletons don't throw if trying to set on the component itself", () => {
    const ecs = new ECS();

    const singletonComponent = ecs.createComponent(z.string());
    singletonComponent.setName("singleton component");
    singletonComponent.add(ecs.builtin.Singleton);

    expect(() => {
      singletonComponent.set(singletonComponent, "some value");
    }).not.toThrow();
  });

  test("When setting a component on the ecs world itself, it automatically becomes a singleton", () => {
    const ecs = new ECS();

    const singletonComponent = ecs.createComponent(z.string());

    ecs.set(singletonComponent, "some value");

    expect(singletonComponent.has(ecs.builtin.Singleton)).toBe(true);
  });
});

describe("Symmetric trait", () => {
  test("Symmetric is a Trait", () => {
    const ecs = new ECS();
    expect(ecs.builtin.Symmetric.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A relationship marked as Symmetric automatically creates the inverse relationship", () => {
    const ecs = new ECS();
    const friendOf = ecs.createTag("friend of");
    friendOf.add(ecs.builtin.Symmetric);

    const alice = ecs.createNamedEntity("Alice");
    const bob = ecs.createNamedEntity("Bob");

    alice.add(friendOf, bob);

    expect(alice.has(friendOf, bob)).toBe(true);
    expect(bob.has(friendOf, alice)).toBe(true);
  });

  test("A relationship marked as Symmetric automatically removes the inverse relationship when removed", () => {
    const ecs = new ECS();
    const friendOf = ecs.createTag("friend of");
    friendOf.add(ecs.builtin.Symmetric);
    const alice = ecs.createNamedEntity("Alice");
    const bob = ecs.createNamedEntity("Bob");
    alice.add(friendOf, bob);

    alice.remove(friendOf, bob);

    expect(alice.has(friendOf, bob)).toBe(false);
    expect(bob.has(friendOf, alice)).toBe(false);
  });

  test("When Symmetric is removed from a relationship, it no longer adds the inverse when added", () => {
    const ecs = new ECS();
    const friendOf = ecs.createTag("friend of");
    friendOf.add(ecs.builtin.Symmetric);

    const alice = ecs.createNamedEntity("Alice");
    const bob = ecs.createNamedEntity("Bob");
    const clint = ecs.createNamedEntity("Clint");

    alice.add(friendOf, bob);
    friendOf.remove(ecs.builtin.Symmetric);
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
    const ecs = new ECS();
    expect(ecs.builtin.Target.has(ecs.builtin.Trait)).toBe(true);
  });

  test("An entity marked as Target can be used as target of a relationship", () => {
    const ecs = new ECS();

    const e = ecs.createEntity();
    const target = ecs.createEntity();
    target.add(ecs.builtin.Target);
    const r = ecs.createTag();

    expect(() => {
      e.add(r, target);
    }).not.toThrow();
  });

  test("An entity marked as Target can NOT be used as a relationship", () => {
    const ecs = new ECS();

    const e = ecs.createEntity();
    const target = ecs.createNamedEntity("marked target");
    target.add(ecs.builtin.Target);
    const r = ecs.createTag();

    expect(() => {
      e.add(target, r);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a relationship',
    );
  });

  test("An entity marked as Target can NOT be used as component", () => {
    const ecs = new ECS();

    const e = ecs.createEntity();
    const target = ecs.createNamedEntity("marked target");
    target.add(ecs.builtin.Target);

    expect(() => {
      e.add(target);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a component',
    );
  });
});

describe("TargetMustBeDefaultInitializable trait", () => {
  test("TargetMustBeDefaultInitializable is a trait", () => {
    const ecs = new ECS();
    expect(
      ecs.builtin.TargetMustBeDefaultInitializable.has(ecs.builtin.Trait),
    ).toBe(true);
  });

  test("A relationship marked as TargetMustBeDefaultInitializable cannot be used with a component that cannot be default initialized", () => {
    const ecs = new ECS();
    const entity = ecs.createEntity();
    const nonDefaultInitializable = ecs.createComponent(z.string());
    nonDefaultInitializable.setName("non default initializable");

    const r = ecs.createTag("some relationship");
    r.add(ecs.builtin.RelationshipHasNoData);
    r.add(ecs.builtin.TargetMustBeDefaultInitializable);

    expect(() => entity.add(r, nonDefaultInitializable)).toThrow(
      'Relationship "some relationship" is marked as TargetMustBeDefaultInitializable while target "non default initializable" has data and is not default initializable',
    );
  });
});

describe("Exclusive Trait", () => {
  //TODO[epic=basics, seq=2] - Exclusive Trait
  test("Exclusive is a Trait", () => {
    const ecs = new ECS();
    expect(ecs.builtin.Exclusive.has(ecs.builtin.Trait)).toBe(true);
  });

  test("If an exclusive relationship is added to an entity with a different target, the target is replaced, not added", () => {
    const ecs = new ECS();
    const isOnPlanet = ecs.createTag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);

    const earth = ecs.createNamedEntity("Earth");
    const mars = ecs.createNamedEntity("Mars");

    const alice = ecs.createNamedEntity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(isOnPlanet, mars);

    expect(alice.has(isOnPlanet, earth)).toBe(false);
    expect(alice.has(isOnPlanet, mars)).toBe(true);
  });

  test("on Exclusive replacement, data of former is also replaced", () => {
    const ecs = new ECS();
    const isOnPlanet = ecs.createComponent(z.number().default(0));
    isOnPlanet.add(ecs.builtin.Exclusive);

    const earth = ecs.createNamedEntity("Earth");
    const mars = ecs.createNamedEntity("Mars");

    const alice = ecs.createNamedEntity("Alice");

    alice.set(isOnPlanet, earth, 100);
    alice.set(isOnPlanet, mars, 200);

    expect(alice.get(isOnPlanet, earth)).toBeUndefined();
    expect(alice.get(isOnPlanet, mars)).toBe(200);
  });

  test("If an exclusive relationship which also has With's is replaced, the Withs are also replaced", () => {
    const ecs = new ECS();

    const isOnPlanet = ecs.createTag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);

    const hasAtmosphere = ecs.createTag("has atmosphere");
    isOnPlanet.add(ecs.builtin.With, hasAtmosphere);

    const likesCurrentPlanet = ecs.createTag("likes current planet");
    isOnPlanet.add(ecs.builtin.With, likesCurrentPlanet);

    const earth = ecs.createNamedEntity("Earth");
    const mars = ecs.createNamedEntity("Mars");

    const alice = ecs.createNamedEntity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(isOnPlanet, mars);

    expect(alice.has(hasAtmosphere, mars)).toBe(true);
    expect(alice.has(likesCurrentPlanet, mars)).toBe(true);
    expect(alice.has(hasAtmosphere, earth)).toBe(false);
    expect(alice.has(likesCurrentPlanet, earth)).toBe(false);
  });

  test("When an exclusive relationship is added, but the replacement cannot be added, there should not be a remove", () => {
    const ecs = new ECS();
    const isOnPlanet = ecs.createTag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);
    isOnPlanet.add(ecs.builtin.TargetMustBeDefaultInitializable);

    const earth = ecs.createNamedEntity("Earth");
    const mars = ecs.createComponent(z.string());

    const alice = ecs.createNamedEntity("Alice");

    alice.add(isOnPlanet, earth);

    expect(() => {
      alice.add(isOnPlanet, mars);
    }).toThrow();

    expect(alice.has(isOnPlanet, earth)).toBe(true);
    expect(alice.has(isOnPlanet, mars)).toBe(false);
  });

  test("Replacing an exclusive relationship happens with a single archetype move, and one archetype link being created, even under complex circumstances", () => {
    const ecs = new ECS();
    ecs.startStatistics();
    const isOnPlanet = ecs.createTag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);

    const hasAtmosphere = ecs.createTag("has atmosphere");
    isOnPlanet.add(ecs.builtin.With, hasAtmosphere);

    const likesCurrentPlanet = ecs.createTag("likes current planet");
    isOnPlanet.add(ecs.builtin.With, likesCurrentPlanet);

    const someOtherTag = ecs.createTag("some other tag");

    const earth = ecs.createNamedEntity("Earth");
    const mars = ecs.createNamedEntity("Mars");

    const alice = ecs.createNamedEntity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(someOtherTag); // this matters, because this way the archetype for just removing (isOnPlanet, earth) doesn't exist

    const archetypeCountBefore = ecs.getArchetypeCount();
    const archetypeLinkCountBefore = ecs.getArchetypeGraphEdgeCount();
    const expensiveLookupsBefore = ecs.getStatistics()!.expensiveLookups;

    alice.add(isOnPlanet, mars);

    const archetypeCountAfter = ecs.getArchetypeCount();
    const archetypeLinkCountAfter = ecs.getArchetypeGraphEdgeCount();
    const expensiveLookupsAfter = ecs.getStatistics()!.expensiveLookups;

    expect(archetypeCountAfter).toBe(archetypeCountBefore + 1);
    expect(archetypeLinkCountAfter).toBe(archetypeLinkCountBefore + 1);
    expect(expensiveLookupsAfter).toBe(expensiveLookupsBefore + 1);
  });

  // test("If an exclusive relationship which also has With's is replaced, the data of the Withs are also replaced", () => {});

  // test("If an exclusive relationship is also Symmetric, the replacement also replaces on the two symmetry targets", () => {

  // });

  //TODO[epic=atomic operations] Exclusive replacements should happen with a single archetype move, and establish a single archetype link, not multiple moves and links
  //TODO[epic=atomic operations] If an exclusive relationship is target of a With, adding it should work correctly
});

describe("Atomic operations", () => {
  test("When an add operation throws, it does not leave the ECS in a dirty state", () => {
    const ecs = new ECS();

    const e = ecs.createEntity();
    const target = ecs.createNamedEntity("marked target");
    target.add(ecs.builtin.Target);
    const r = ecs.createTag();

    expect(() => {
      e.add(target, r);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a relationship',
    );

    expect(ecs._debugBackendOperationIsDirty()).toBe(false);
  });

  test("When a nested operation fails inside an operation, no changes are made", () => {
    const ecs = new ECS();
    const relationshipComponent = ecs.createTag("relationship component");
    relationshipComponent.add(ecs.builtin.Relationship);

    const tag = ecs.createTag("tag");
    tag.add(ecs.builtin.With, relationshipComponent); // this will try to add relationshipComponent as a component, which should throw, but it should not add the With relationship

    const e = ecs.createEntity();

    expect(() => e.add(tag)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a component',
    );

    expect(ecs._debugBackendOperationIsDirty()).toBe(false);
    expect(e.has(tag)).toBe(false);
    expect(e.has(relationshipComponent)).toBe(false);
  });
});

describe("Queries", () => {
  //TODO[epic=queries] - Single Term Queries
  //TODO[epic=queries] - Multi-Term Queries
  //TODO[epic=queries] - Wildcard Queries https://www.flecs.dev/flecs/md_docs_2Queries.html#wildcards
  //TODO[epic=queries] - Any-wildcard Queries https://www.flecs.dev/flecs/md_docs_2Queries.html#wildcards
  //TODO[epic=queries] - Cached Queries
  //TODO[epic=queries] - .each((...)=>{...}) https://github.com/SanderMertens/flecs/blob/master/examples/cpp/queries/each_callback/src/main.cpp
  //TODO[epic=queries] - .run https://github.com/SanderMertens/flecs/blob/master/examples/cpp/queries/basics/src/main.cpp
  //TODO[epic=queries] - ignore empty tables for cached queries https://www.flecs.dev/flecs/md_docs_2Queries.html#performance-and-caching
  //TODO[epic=queries] - querying by component-name (gives any, I guess) https://www.flecs.dev/flecs/md_docs_2Queries.html#components-2
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

describe("Hierarchies", () => {
  //TODO[epic=hierarchies] - ChildOf Relationship
  //TODO[epic=hierarchies] - parent() and getChildren()
  //TODO[epic=hierarchies] - world.lookup(parent.child) to find children by name
  //TODO[epic=hierarchies] - parent.lookup(child)
});

describe("OneOf Trait", () => {
  //TODO[epic=hierarchies] - OneOf Trait
});

describe("Inheritance", () => {
  //TODO[epic=Inheritance] - prefabs
  //TODO[epic=Inheritance] - IsA Relationship
  //TODO[epic=Inheritance] - inheritance-queries https://github.com/SanderMertens/flecs/blob/master/examples/cpp/queries/component_inheritance/src/main.cpp
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

//SECTION - Sparse storage
//TODO[epic=sparse] - DontFragment trait
//TODO[epic=sparse] - Sparse trait
//!SECTION

//SECTION - Events
//!SECTION

//TODO[epic=???] - cyclic variables queries https://github.com/SanderMertens/flecs/blob/master/examples/cpp/queries/cyclic_variables/src/main.cpp
//TODO[epic=???] - change tracking for queries
//TODO[epic=???] - ecs.deleteEmptyTables
