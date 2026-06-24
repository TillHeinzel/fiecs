import { describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../index";

describe("entity creation and names", () => {
  test("default constructor", () => {
    const world = new Fiecs.World();

    expect(world).toBeInstanceOf(Fiecs.World);
  });

  test("create new entity", () => {
    const world = new Fiecs.World();
    const e = world.entity();

    expect(e).toBeDefined();
  });

  test("create new entity with name", () => {
    const world = new Fiecs.World();
    const e = world.entity("Bob");

    expect(e.getName()).toBe("Bob");
  });

  test("get original entity if name exists", () => {
    const world = new Fiecs.World();
    const e1 = world.entity("Bob");
    const e2 = world.entity("Bob");

    expect(e1.isSameAs(e2)).toBe(true);
  });

  test("lookup nonexistent name is undefined", () => {
    const world = new Fiecs.World();

    expect(world.lookupEntity("Bob")).toBeUndefined();
  });

  test("setting name to an already existing name throws", () => {
    const world = new Fiecs.World();
    world.entity("Bob");
    const e2 = world.entity();

    expect(() => e2.setName("Bob")).toThrow();
  });

  test("setting an entities name to its own current name is ok and does nothing", () => {
    const world = new Fiecs.World();
    const bob = world.entity("Bob");

    expect(() => bob.setName("Bob")).not.toThrow();
  });

  test("changing name means old name can no longer be used to lookup the entity", () => {
    const world = new Fiecs.World();
    const e = world.entity("Bob");
    expect(e.getName()).toBe("Bob");
    expect(world.lookupEntity("Bob")).toBeDefined();

    e.setName("Alice");

    expect(e.getName()).toBe("Alice");
    expect(world.lookupEntity("Bob")).toBeUndefined();
    expect(world.lookupEntity("Alice")).toBeDefined();
    expect(world.lookupEntity("Alice")!.getName()).toBe("Alice");
  });

  test("multiple entity objects target the same underlying data", () => {
    const world = new Fiecs.World();

    const e1 = world.entity("Bob");

    expect(e1.getName()).toBe("Bob");

    const e2 = world.lookupEntity("Bob");

    expect(e1).not.toBe(e2);
    expect(e1.isSameAs(e2!)).toBe(true);

    expect(e2).toBeDefined();
    expect(e2?.getName()).toBe("Bob");

    e1.setName("Alice");

    expect(e1.getName()).toBe("Alice");
    expect(e2!.getName()).toBe("Alice");
  });

  test("setName returns entity for chaining", () => {
    const world = new Fiecs.World();

    const e1 = world.entity("Bob");

    expect(e1.getName()).toBe("Bob");

    const e2 = e1.setName("Alice").setName("Clint");

    expect(e2).toBe(e1);
    expect(e1.getName()).toBe("Clint");
    expect(world.lookupEntity("Bob")).toBeUndefined();
    expect(world.lookupEntity("Alice")).toBeUndefined();
  });
});

describe("entity aliveness and destruction", () => {
  test("new entities are alive", () => {
    const world = new Fiecs.World();
    const e = world.entity();

    expect(e.isAlive()).toBe(true);
  });

  test("destructed entities are not alive", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    e.destruct();

    expect(e.isAlive()).toBe(false);
  });

  test("destruct cannot be chained", () => {
    const world = new Fiecs.World();
    const e = world.entity();

    const x = e.destruct();

    expect(x).toBeUndefined();
  });

  test("destructed entities cannot be looked up", () => {
    const world = new Fiecs.World();
    const e = world.entity("Bob");
    e.destruct();

    expect(world.lookupEntity("Bob")).toBeUndefined();
  });

  test("destructed entities have no name", () => {
    const world = new Fiecs.World();

    const e = world.entity("Bob");
    e.destruct();
    expect(e.getName()).toBeUndefined();
  });

  test("destructing an entity removes all its tags", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();
    e.add(playerTag);
    e.add(aiTag);

    e.destruct();

    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("destructing an entity removes all its components", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number());
    const mana = world.component(z.number());
    e.set(health, 100);
    e.set(mana, 50);

    e.destruct();

    expect(e.has(health)).toBe(false);
    expect(e.has(mana)).toBe(false);
    expect(e.get(health)).toBeUndefined();
    expect(e.get(mana)).toBeUndefined();
  });

  test("destructing an entity removes all its pair tags", () => {
    const world = new Fiecs.World();

    const eats = world.tag();

    const apples = world.entity();
    const pears = world.entity();

    const bob = world.entity();
    bob.add([eats, apples]);
    bob.add([eats, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(true);

    bob.destruct();

    expect(bob.has([eats, apples])).toBe(false);
    expect(bob.has([eats, pears])).toBe(false);
  });
});

describe("Tags: create, add, remove and check for", () => {
  test("Creating a tag ", () => {
    const world = new Fiecs.World();
    const c = world.tag();

    expect(c).toBeDefined();
  });

  test("A tag can be created with a name", () => {
    const world = new Fiecs.World();
    const player = world.tag("Player");

    expect(player.getName()).toBe("Player");
  });

  test("adding a tag requires it being created first", () => {
    const world = new Fiecs.World();
    const tag = world.tag();
    const e = world.entity();
    expect(() => e.add(tag)).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantTag = otherEcs.tag();
    expect(() => e.add(deviantTag)).toThrow("Component does not exist in ECS");
  });

  test("add can be chained", () => {
    const world = new Fiecs.World();
    const tag = world.tag();
    const e = world.entity();

    const e2 = e.add(tag);
    expect(e2).toBe(e);
  });

  test("adding a tag to an entity will show that it has that tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();
    e.add(playerTag);

    expect(e.has(playerTag)).toBe(true);
    const aiTag = world.tag();
    expect(e.has(aiTag)).toBe(false);
  });

  test("tags can be added by name", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag("Player");
    const e = world.entity();
    e.add("Player");

    expect(e.has(playerTag)).toBe(true);
  });

  test("Fiecs throws an error when trying to add a tag by name without the name existing", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag("Player");
    const e = world.entity();
    expect(() => e.add("AI")).toThrow(
      'Could not find component with name ""AI""',
    );

    expect(e.has(playerTag)).toBe(false);
  });

  test("tags can be checked by name", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag("Player");
    const e = world.entity();
    e.add(playerTag);

    expect(e.has("Player")).toBe(true);
  });

  test("checking for tags by names that don't exist returns false", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag("Player");
    const e = world.entity();
    e.add(playerTag);

    expect(e.has("AI")).toBe(false);
  });

  test("adding a tag to an entity will show that it has with wildcard", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();
    expect(e.has(world.wildcard)).toBe(false);

    e.add(playerTag);
    expect(e.has(world.wildcard)).toBe(true);
  });

  test("adding a tag to an entity will NOT show that it has with [*,*], [tag, *] or [*, tag]", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();
    expect(e.has([world.wildcard, world.wildcard])).toBe(false);
    expect(e.has([playerTag, world.wildcard])).toBe(false);
    expect(e.has([world.wildcard, playerTag])).toBe(false);

    e.add(playerTag);
    expect(e.has([world.wildcard, world.wildcard])).toBe(false);
    expect(e.has([playerTag, world.wildcard])).toBe(false);
    expect(e.has([world.wildcard, playerTag])).toBe(false);
  });

  test("tags can be iterated over with components() ", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components());
    expect(comps).toIncludeSameMembers([playerTag, aiTag]);
  });

  test("components(tag) returns the correct component", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(playerTag));
    expect(comps).toIncludeSameMembers([playerTag]);
  });

  test("components(name) returns the correct component", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag("Player");
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components("Player"));
    expect(comps).toIncludeSameMembers([playerTag]);
  });

  test("components(name) for nonexistent names returns no components", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components("Player"));
    expect(comps).toIncludeSameMembers([]);
  });

  test("components(tag) returns nothing if the tag is not on the entity", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    // e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(playerTag));
    expect(comps).toIncludeSameMembers([]);
  });

  test("tags can be iterated over with components(*) ", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(world.wildcard));
    expect(comps).toIncludeSameMembers([playerTag, aiTag]);
  });

  test("tags will not be iterated over with components(*, *) ", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components([world.wildcard, world.wildcard]));
    expect(comps).toIncludeSameMembers([]);
  });

  test("tags will not be iterated over with components(tag, *) ", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components([playerTag, world.wildcard]));
    expect(comps).toIncludeSameMembers([]);
  });
  test("tags will not be iterated over with components(*, tag) ", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components([world.wildcard, aiTag]));
    expect(comps).toIncludeSameMembers([]);
  });

  test("findComponent() will return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    expect(e.findComponent()).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent()?.isSameAs(playerTag)).toBe(true);
  });

  test("findComponent(tag) will return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    expect(e.findComponent(playerTag)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(playerTag)?.isSameAs(playerTag)).toBe(true);
  });

  test("findComponent(name) will return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag("Player");
    const e = world.entity().add(playerTag);

    expect(e.findComponent("Player")?.isSameAs(playerTag)).toBe(true);
  });

  test("findComponent(name) will return undefined if the name does not exist", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity().add(playerTag);

    expect(e.findComponent("Player")).toBe(undefined);
  });

  test("findComponent(otherTag) will return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    expect(e.findComponent(aiTag)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(aiTag)).toBeUndefined();
  });

  test("findComponent(*) will return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    expect(e.findComponent(world.wildcard)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(world.wildcard)?.isSameAs(playerTag)).toBe(true);
  });

  test("findComponent(*, *) will not return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    expect(e.findComponent([world.wildcard, world.wildcard])).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent([world.wildcard, world.wildcard])).toBeUndefined();
  });

  test("findComponent(tag, *) will not return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    expect(e.findComponent([playerTag, world.wildcard])).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent([playerTag, world.wildcard])).toBeUndefined();
  });

  test("findComponent(*, tag) will not return an added tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    expect(e.findComponent([world.wildcard, playerTag])).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent([world.wildcard, playerTag])).toBeUndefined();
  });

  test("removing a tag from an entity will show that it no longer has that tag", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);

    e.remove(playerTag);
    expect(e.has(playerTag)).toBe(false);
  });

  test("a tag can be removed by name", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag("Player");
    const e = world.entity().add(playerTag);
    expect(e.has(playerTag)).toBe(true);

    e.remove("Player");
    expect(e.has(playerTag)).toBe(false);
  });

  test("removing a tag by a name which does not exist quitly does nothing", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    expect(world.lookupEntity("PLayer")).toBe(undefined);

    expect(() => e.remove("Player")).not.toThrow();
  });

  test("remove can be chained", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    const e2 = e.remove(playerTag);
    expect(e2).toBe(e);
  });

  test("removing * from an entity will remove any tags", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove(world.wildcard);
    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("removing [*,*] from an entity will not remove any tags", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove([world.wildcard, world.wildcard]);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);
  });

  test("removing [tag,*] from an entity will not remove any tags", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove([playerTag, world.wildcard]);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);
  });

  test("removing [*,tag] from an entity will not remove any tags", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove([world.wildcard, aiTag]);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);
  });

  test("adding a tag twice changes nothing", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(false);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing tag the entity does not have does nothing", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    e.remove(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("clear removes all tags from the entity", () => {
    const world = new Fiecs.World();
    const playerTag = world.tag();
    const aiTag = world.tag();
    const e = world.entity();
    e.add(playerTag);
    e.add(aiTag);
    e.clear();

    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("clear can be chained", () => {
    const world = new Fiecs.World();
    const e = world.entity();

    const e2 = e.clear();

    expect(e2).toBe(e);
  });

  test("adding a tag to two entities with the same original archetype only requires one expensive lookup ", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const playerTag = world.tag();
    const e1 = world.entity();
    const e2 = world.entity();
    expect(world.getStatistics().expensiveLookups).toBe(0);
    e1.add(playerTag);
    expect(world.getStatistics().expensiveLookups).toBe(1);
    e2.add(playerTag);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing a tag does not require additional expensive lookups, because links are created when the tag is added", () => {
    const world = new Fiecs.World();
    world.startStatistics();

    const playerTag = world.tag();
    const e1 = world.entity();

    e1.add(playerTag);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    e1.remove(playerTag);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("when adding two tags and then removing the first, each operation adds a link", () => {
    const world = new Fiecs.World();
    world.startStatistics();

    const playerTag = world.tag();
    const aiTag = world.tag();
    const e1 = world.entity();

    e1.add(playerTag);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    e1.add(aiTag);
    expect(world.getStatistics().expensiveLookups).toBe(2);

    e1.remove(playerTag);
    expect(world.getStatistics().expensiveLookups).toBe(3);
  });

  test("entities can be used as tags on other entities, as tags are just entities", () => {
    const world = new Fiecs.World();
    const bob = world.entity("Bob");
    const alice = world.entity("Alice");
    alice.add(bob);

    expect(alice.has(bob)).toBe(true);
  });

  test("Trying to set data on a tag throws", () => {
    const world = new Fiecs.World();
    const tag = world.tag("tag");
    const e = world.entity();
    // @ts-expect-error // should not be allowed in ts, but needs to be tested
    expect(() => e.set(tag, 5)).toThrow('"tag" has no data to be set');
  });
});

describe("statistics", () => {
  test("if statistics is started, can fetch statistics", () => {
    const world = new Fiecs.World();

    world.startStatistics();

    expect(world.getStatistics()).toBeDefined();
  });
  test("if statistics is not started, can't fetch statistics", () => {
    const world = new Fiecs.World();

    expect(() => world.getStatistics()).toThrow("Statistics not started");
  });

  test("if statistics is started then stopped, can't fetch statistics", () => {
    const world = new Fiecs.World();

    world.startStatistics();
    world.stopStatistics();

    expect(() => world.getStatistics()).toThrow("Statistics not started");
  });

  test("if statistics is started, expensive archetype lookups are counted", () => {
    const world = new Fiecs.World();
    const cheeseTag = world.tag();
    world.startStatistics();

    const e = world.entity();
    e.add(cheeseTag);
    expect(world.getStatistics().expensiveLookups).toBe(1);
    const breadTag = world.tag();
    e.add(breadTag);
    expect(world.getStatistics().expensiveLookups).toBe(2);
  });

  test("can lookup archetypes added", () => {
    const world = new Fiecs.World();
    const cheese = world.tag();

    world.startStatistics();
    const e = world.entity();
    e.add(cheese);
    expect(world.getStatistics().archetypesAdded).toEqual(1);

    e.add([cheese, e]);
    expect(world.getStatistics().archetypesAdded).toEqual(2);
  });

  test("can lookup number of edges between archetypes", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const cheese = world.tag();
    const e = world.entity();

    world.startStatistics();
    e.add(cheese);
    expect(world.getStatistics().linksAdded).toEqual(2);

    world.startStatistics();
    e.add([cheese, e]);
    expect(world.getStatistics().linksAdded).toEqual(2);

    world.startStatistics();
    e.remove(cheese);
    expect(world.getStatistics().linksAdded).toEqual(2);

    world.startStatistics();
    e.remove([cheese, e]);
    expect(world.getStatistics().linksAdded).toEqual(2);
  });
});

describe("components: create, add, set, remove, check for", () => {
  test("Creating a component", () => {
    const world = new Fiecs.World();
    const c = world.component(z.number());

    expect(c).toBeDefined();
  });

  test("We can access the underlying initializer for a component", () => {
    const world = new Fiecs.World();
    const initializer = z.number().default(0);
    const c = world.component(initializer);
    expect(c.getInitializer()).toBe(initializer);
  });

  test("registering a component twice with the same initializer returns the same component", () => {
    const world = new Fiecs.World();

    const initializer = z.number();
    const c1 = world.component(initializer);
    const c2 = world.component(initializer);
    expect(c2.isSameAs(c1)).toBe(true);
  });

  test("adding a component requires it being created first", () => {
    const world = new Fiecs.World();
    const c = world.component(z.number().default(0));
    const e = world.entity();
    expect(() => e.add(c)).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantComponent = otherEcs.component(z.number().default(0));

    expect(() => e.add(deviantComponent)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("adding a component means that component can be gotten back", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number().default(0));

    e.add(health);
    expect(e.get(health)).toBe(0);
  });

  test("getting a non-existent component returns undefined", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number());
    expect(e.get(health)).toBeUndefined();
  });

  test("components are independent of each other", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number());
    const mana = world.component(z.number());
    e.set(health, 100);
    e.set(mana, 50);
    expect(e.get(health)).toBe(100);
    expect(e.get(mana)).toBe(50);
  });

  test("set can be chained", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number());
    const e2 = e.set(health, 100);
    expect(e2).toBe(e);
  });

  test("a component that has been added can be checked for existence", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number().default(0));
    e.add(health);
    expect(e.has(health)).toBe(true);
  });

  test("added components are returned with components(), but without type information", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number().default(0));
    const mana = world.component(z.number().default(0));
    e.add(health);
    e.add(mana);

    const comps = Array.from(e.components());
    expect(comps).toIncludeSameMembers([health, mana]);
  });

  test("removing a component means that component can no longer be gotten or checked for existence", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number().default(0));
    e.add(health);
    expect(e.has(health)).toBe(true);
    e.remove(health);
    expect(e.has(health)).toBe(false);
    expect(e.get(health)).toBeUndefined();
  });

  test("If a component doesn't have a default, add throws", () => {
    const world = new Fiecs.World();
    const health = world.component(z.number());
    health.setName("health");
    const e = world.entity();
    expect(() => e.add(health)).toThrow(
      'Component "health" cannot be default initialized',
    );
  });

  test("A components value can be set, and the updated value can be get", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number().default(0));
    e.add(health);
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("setting a component automatically adds it", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number().default(0));
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("set allows a component to have no default value", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number());
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("Setting a component with a bad type throws an error", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number());
    // @ts-expect-error // this should throw because "not a number" is not a number
    expect(() => e.set(health, "not a number")).toThrow(
      "Invalid component data",
    );
  });

  test("Setting a component which doesn't fulfill the schema throws an error", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number().min(0).max(100));
    expect(() => e.set(health, -1)).toThrow("Invalid component data");
    expect(() => e.set(health, 101)).toThrow("Invalid component data");
  });

  test("Adding a component to an entity that already has it does nothing", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const health = world.component(z.number().default(100));
    const e = world.entity();
    e.set(health, 50);
    e.add(health);
    expect(e.get(health)).toBe(50);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("adding a component requires it being created first", () => {
    const world = new Fiecs.World();
    const c = world.component(z.number().default(0));
    const e = world.entity();
    expect(() => e.add(c)).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantComponent = otherEcs.component(z.number().default(0));

    expect(() => e.add(deviantComponent)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("clearing an entity removes all components from the entity", () => {
    const world = new Fiecs.World();
    const e = world.entity();
    const health = world.component(z.number());
    const mana = world.component(z.number());
    e.set(health, 100);
    e.set(mana, 50);
    e.clear();
    expect(e.has(health)).toBe(false);
    expect(e.has(mana)).toBe(false);
    expect(e.get(health)).toBeUndefined();
    expect(e.get(mana)).toBeUndefined();
  });

  test("adding a component to two entities with the same original archetype only requires one expensive lookup", () => {
    const world = new Fiecs.World();
    world.startStatistics();

    const health = world.component(z.number());

    const e1 = world.entity();
    const e2 = world.entity();
    expect(world.getStatistics().expensiveLookups).toBe(0);
    e1.set(health, 100);
    expect(world.getStatistics().expensiveLookups).toBe(1);
    e2.set(health, 50);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing a component from an entity does not require and expensive lookup, because links are established on add", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const health = world.component(z.number());
    const e1 = world.entity();
    e1.set(health, 100);
    expect(world.getStatistics().expensiveLookups).toBe(1);
    e1.remove(health);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("when adding two components and then removing the first, each operation adds a link", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const health = world.component(z.number());
    const damage = world.component(z.number());
    const e1 = world.entity();

    e1.set(health, 100);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    e1.set(damage, 50);
    expect(world.getStatistics().expensiveLookups).toBe(2);

    e1.remove(health);
    expect(world.getStatistics().expensiveLookups).toBe(3);
  });

  test("A component can be set to undefined", () => {
    const world = new Fiecs.World();
    const e = world.entity();

    const health = world.component({ parse: (x: number | undefined) => x });
    e.set(health, 100);
    expect(e.get(health)).toBe(100);

    e.set(health, undefined);
    expect(e.get(health)).toBeUndefined();
  });
});

describe("pairs: create, add, set, remove, check for", () => {
  test("adding a pair tag requires a created Tag or Component", () => {
    const world = new Fiecs.World();
    const likes = world.tag();
    const bob = world.entity();
    const apples = world.entity();
    expect(() => bob.add([likes, apples])).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantRelationshipTag = otherEcs.tag();
    expect(() => bob.add([deviantRelationshipTag, apples])).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("adding a pair tag to an entity will show that it has that relationship tag", () => {
    const world = new Fiecs.World();

    const eats = world.tag();

    const apples = world.entity();
    const pears = world.entity();

    const bob = world.entity();
    bob.add([eats, apples]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(false);
  });

  test("adding a pair tag to an entity will show that it has [*,*], [relationship, *], [*, target]", () => {
    const world = new Fiecs.World();

    const eats = world.tag();
    const apples = world.entity();
    const bob = world.entity();

    expect(bob.has([world.wildcard, world.wildcard])).toBe(false);
    expect(bob.has([eats, world.wildcard])).toBe(false);
    expect(bob.has([world.wildcard, apples])).toBe(false);

    bob.add([eats, apples]);
    expect(bob.has([world.wildcard, world.wildcard])).toBe(true);
    expect(bob.has([eats, world.wildcard])).toBe(true);
    expect(bob.has([world.wildcard, apples])).toBe(true);
  });

  test("adding a pair tag to an entity will NOT show that it has *", () => {
    const world = new Fiecs.World();

    const eats = world.tag();
    const apples = world.entity();
    const bob = world.entity();

    expect(bob.has(world.wildcard)).toBe(false);

    bob.add([eats, apples]);
    expect(bob.has(world.wildcard)).toBe(false);
  });

  test("Added pairs will be returned by components()", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    const apples = world.entity();
    const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);
    bob.add([eats, pears]);

    const comps = Array.from(bob.components());
    expect(comps).toIncludeSameMembers([
      world.pair(eats, apples),
      world.pair(eats, pears),
    ]);
  });

  test("Added pairs will not be returned by components(*)", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    const apples = world.entity();
    const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);
    bob.add([eats, pears]);

    const comps = Array.from(bob.components(world.wildcard));
    expect(comps).toIncludeSameMembers([]);
  });

  test("Added pairs will be returned by components(*,*)", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    const apples = world.entity();
    const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);
    bob.add([eats, pears]);

    const comps = Array.from(bob.components([world.wildcard, world.wildcard]));
    expect(comps).toIncludeSameMembers([
      world.pair(eats, apples),
      world.pair(eats, pears),
    ]);
  });

  test("Added pairs will be suitably returned by components(relationship,*)", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    const likes = world.tag();
    const apples = world.entity();
    const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);
    bob.add([eats, pears]);
    bob.add([likes, apples]);
    bob.add([likes, pears]);

    const comps = Array.from(bob.components([eats, world.wildcard]));
    expect(comps).toIncludeSameMembers([
      world.pair(eats, apples),
      world.pair(eats, pears),
    ]);
  });

  test("Added pairs will be suitably returned by components(relationship,*)", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    const likes = world.tag();
    const apples = world.entity();
    const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);
    bob.add([eats, pears]);
    bob.add([likes, apples]);
    bob.add([likes, pears]);

    const comps = Array.from(bob.components([world.wildcard, apples]));
    expect(comps).toIncludeSameMembers([
      world.pair(eats, apples),
      world.pair(likes, apples),
    ]);
  });

  test("findComponent() will return an added pair", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    // const likes = world.tag();
    const apples = world.entity();
    // const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);

    expect(bob.findComponent()?.isSameAs(world.pair(eats, apples))).toBe(true);
  });

  test("findComponent(*) will not return an added pair", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    // const likes = world.tag();
    const apples = world.entity();
    // const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);

    expect(bob.findComponent(world.wildcard)).toBeUndefined();
  });

  test("removing a relationship tag from an entity will show that it no longer has that relationship tag, without affecting other relationships", () => {
    const world = new Fiecs.World();

    const eats = world.tag();
    const apples = world.entity("apples");
    const pears = world.entity("pears");
    const bob = world.entity("bob");

    bob.add([eats, apples]);
    bob.add([eats, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(true);

    bob.remove([eats, apples]);

    expect(bob.has([eats, apples])).toBe(false);
    expect(bob.has([eats, pears])).toBe(true);
  });

  test("removing [*,*] from an entity will remove all relationships", () => {
    const world = new Fiecs.World();

    const eats = world.tag();
    const apples = world.entity("apples");
    const pears = world.entity("pears");
    const bob = world.entity("bob");

    bob.add([eats, apples]);
    bob.add([eats, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(true);

    bob.remove([world.wildcard, world.wildcard]);

    expect(bob.has([eats, apples])).toBe(false);
    expect(bob.has([eats, pears])).toBe(false);
  });

  test("removing [relationship,*] from an entity will remove all pairs with that relationship", () => {
    const world = new Fiecs.World();

    const eats = world.tag();
    const likes = world.tag();
    const apples = world.entity("apples");
    const pears = world.entity("pears");
    const bob = world.entity("bob");

    bob.add([eats, apples]);
    bob.add([eats, pears]);
    bob.add([likes, apples]);
    bob.add([likes, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(true);
    expect(bob.has([likes, apples])).toBe(true);
    expect(bob.has([likes, pears])).toBe(true);

    bob.remove([likes, world.wildcard]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(true);
    expect(bob.has([likes, apples])).toBe(false);
    expect(bob.has([likes, pears])).toBe(false);
  });

  test("removing [*,target] from an entity will remove all pairs with that target", () => {
    const world = new Fiecs.World();

    const eats = world.tag();
    const likes = world.tag();
    const apples = world.entity("apples");
    const pears = world.entity("pears");
    const bob = world.entity("bob");

    bob.add([eats, apples]);
    bob.add([eats, pears]);
    bob.add([likes, apples]);
    bob.add([likes, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(true);
    expect(bob.has([likes, apples])).toBe(true);
    expect(bob.has([likes, pears])).toBe(true);

    bob.remove([world.wildcard, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(false);
    expect(bob.has([likes, apples])).toBe(true);
    expect(bob.has([likes, pears])).toBe(false);
  });

  test("adding a relationship tag twice does nothing quietly", () => {
    const world = new Fiecs.World();
    world.startStatistics();

    const eats = world.tag();

    const apples = world.entity();
    const pears = world.entity();

    const bob = world.entity();
    bob.add([eats, apples]);
    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(false);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    bob.add([eats, apples]);
    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(false);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing non-existant relationship tag does nothing quietly", () => {
    const world = new Fiecs.World();
    world.startStatistics();

    const eats = world.tag();
    const apples = world.entity();
    const pears = world.entity();
    const bob = world.entity();

    bob.add([eats, apples]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(false);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    bob.remove([eats, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(false);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("clear removes all relationship tags from the entity", () => {
    const world = new Fiecs.World();

    const eats = world.tag();

    const apples = world.entity();
    const pears = world.entity();

    const bob = world.entity();
    bob.add([eats, apples]);
    bob.add([eats, pears]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, pears])).toBe(true);

    bob.clear();

    expect(bob.has([eats, apples])).toBe(false);
    expect(bob.has([eats, pears])).toBe(false);
  });

  test("adding a relationship tag to an entity will show that it has any of that relationship tag", () => {
    const world = new Fiecs.World();

    const eats = world.tag();

    const apples = world.entity();

    const bob = world.entity();
    bob.add([eats, apples]);

    expect(bob.has([eats, world.wildcard])).toBe(true);
  });

  test("removing the last of a relationship type will show that the entity no longer has that relationship tag", () => {
    const world = new Fiecs.World();

    const eats = world.tag();

    const apples = world.entity();
    const pears = world.entity();

    const bob = world.entity();
    bob.add([eats, apples]);
    bob.add([eats, pears]);

    expect(bob.has([eats, world.wildcard])).toBe(true);

    bob.remove([eats, apples]);

    expect(bob.has([eats, world.wildcard])).toBe(true);

    bob.remove([eats, pears]);

    expect(bob.has([eats, world.wildcard])).toBe(false);
  });

  test("we can get the first added target for a relationship tag on an entity", () => {
    const world = new Fiecs.World();
    const eats = world.tag();
    const apples = world.entity();
    const pears = world.entity();

    const bob = world.entity();
    bob.add([eats, apples]);
    bob.add([eats, pears]);

    expect(
      bob
        .findComponent([eats, world.wildcard])!
        .isSameAs(world.pair(eats, apples)),
    ).toBe(true);

    bob.remove([eats, apples]);

    expect(
      bob
        .findComponent([eats, world.wildcard])!
        .isSameAs(world.pair(eats, pears)),
    ).toBe(true);
  });

  test("adding a relationship tag to two entities with the same original archetype only requires one expensive lookup", () => {
    const world = new Fiecs.World();
    world.startStatistics();
    const relatesTo = world.tag();
    const e1 = world.entity();
    const e2 = world.entity();
    const e3 = world.entity();
    expect(world.getStatistics().expensiveLookups).toBe(0);
    e1.add([relatesTo, e3]);
    expect(world.getStatistics().expensiveLookups).toBe(1);
    e2.add([relatesTo, e3]);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing a relationship tag from an entity requires no additional expensive lookups because links are established on add", () => {
    const world = new Fiecs.World();
    world.startStatistics();

    const likes = world.tag();
    const bob = world.entity();
    const alice = world.entity();

    bob.add([likes, alice]);
    expect(world.getStatistics().expensiveLookups).toBe(1);

    bob.remove([likes, alice]);
    expect(world.getStatistics().expensiveLookups).toBe(1);
  });

  test("Relationships can be components", () => {
    const world = new Fiecs.World();
    const eats = world.component(z.number().default(0));
    const bob = world.entity();
    const apples = world.entity();

    bob.add([eats, apples]);

    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, world.wildcard])).toBe(true);
    expect(
      Array.from(bob.components([eats, world.wildcard])),
    ).toIncludeSameMembers([world.pair(eats, apples)]);
    expect(
      bob
        .findComponent([eats, world.wildcard])
        ?.isSameAs(world.pair(eats, apples)),
    ).toBe(true);
  });

  test("Added relationship components can be get like normal components", () => {
    const world = new Fiecs.World();
    const eats = world.component(z.number().default(0));
    const bob = world.entity();
    const apples = world.entity();

    bob.add([eats, apples]);
    expect(bob.get([eats, apples])).toBe(0);
  });

  test("Relationship components can be set and get like normal components", () => {
    const world = new Fiecs.World();
    const eats = world.component(z.number().default(0));
    const bob = world.entity();
    const apples = world.entity();

    bob.set([eats, apples], 5);
    expect(bob.get([eats, apples])).toBe(5);
  });

  test("If the target for a tag-relationship is a component, it's data is used", () => {
    const world = new Fiecs.World();
    const eats = world.component(z.number().default(0));
    const bob = world.entity();
    const apples = world.entity();

    bob.set([apples, eats], 5);
    expect(bob.get([apples, eats])).toBe(5);
  });

  test("If both the first and second parts of a relationship are components, the associated data belongs to the first one", () => {
    const world = new Fiecs.World();
    const eats = world.component(z.number().default(0));
    const bob = world.entity();
    const apples = world.component(z.string().default(""));

    bob.set([eats, apples], 5);
    expect(bob.get([eats, apples])).toBe(5);

    bob.set([apples, eats], "test");
    expect(bob.get([apples, eats])).toBe("test");
  });

  test("concrete pairs can be created on the the world and used like tags & components", () => {
    const world = new Fiecs.World();

    const likes = world.tag();
    const bob = world.entity();
    const alice = world.entity();

    const likesAlice = world.pair(likes, alice);

    expect(likesAlice).toBeDefined();

    bob.add(likesAlice);

    expect(bob.has(likesAlice)).toBe(true);
    expect(bob.has([likes, alice])).toBe(true);
    expect(bob.has([likes, world.wildcard])).toBe(true);
    expect(
      Array.from(bob.components([likes, world.wildcard])),
    ).toIncludeSameMembers([world.pair(likes, alice)]);

    bob.remove(likesAlice);

    expect(bob.has(likesAlice)).toBe(false);
    expect(bob.has([likes, alice])).toBe(false);
    expect(bob.has([likes, world.wildcard])).toBe(false);
    expect(
      Array.from(bob.components([likes, world.wildcard])),
    ).toIncludeSameMembers([]);

    const eats = world.component(z.number().default(0));
    const apples = world.entity();

    const eatsApples = world.pair(eats, apples);

    bob.set(eatsApples, 5);

    expect(bob.has(eatsApples)).toBe(true);
    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, apples])).toBe(true);
    expect(bob.has([eats, world.wildcard])).toBe(true);
    expect(
      Array.from(bob.components([eats, world.wildcard])),
    ).toIncludeSameMembers([world.pair(eats, apples)]);
    expect(
      bob
        .findComponent([eats, world.wildcard])
        ?.isSameAs(world.pair(eats, apples)),
    ).toBe(true);
    expect(bob.get(eatsApples)).toBe(5);
  });

  test("concrete pairs can be created from names", () => {
    const world = new Fiecs.World();

    const likes = world.tag("likes");
    const alice = world.entity("alice");

    const likesAlice = world.pair(likes, alice);

    expect(world.pair("likes", alice)).toEqual(likesAlice);
    expect(world.pair("likes", "alice")).toEqual(likesAlice);
    expect(world.pair(likes, "alice")).toEqual(likesAlice);
  });

  test(".pair() throws if names are used that don't exist", () => {
    const world = new Fiecs.World();

    const likes = world.tag();
    const alice = world.entity();

    expect(() => world.pair("likes", alice)).toThrow(
      'There is no entity called "likes" to create a pair from',
    );
    expect(() => world.pair("likes", "alice")).toThrow(
      'There is no entity called "likes" to create a pair from',
    );
    expect(() => world.pair(likes, "alice")).toThrow(
      'There is no entity called "alice" to create a pair from',
    );
  });

  test("concrete relationship-wildcard pairs can be created on the the world and used normally", () => {
    const world = new Fiecs.World();
    const likes = world.tag();
    const bob = world.entity();
    const alice = world.entity();
    const likesWildcard = world.pair(likes, world.wildcard);
    expect(likesWildcard).toBeDefined();

    bob.add([likes, alice]);
    expect(bob.has(likesWildcard)).toBe(true);
    expect(Array.from(bob.components(likesWildcard))).toIncludeSameMembers([
      world.pair(likes, alice),
    ]);
    expect(bob.findComponent(likesWildcard)).toEqual(world.pair(likes, alice));
    bob.remove(likesWildcard);
    expect(bob.has(likesWildcard)).toBe(false);
    expect(bob.has([likes, alice])).toBe(false);
    expect(bob.has(likesWildcard)).toBe(false);
    expect(Array.from(bob.components(likesWildcard))).toIncludeSameMembers([]);
  });

  test("concrete wildcard-target pairs can be created on the the world and used normally", () => {
    const world = new Fiecs.World();
    const likes = world.tag();
    const bob = world.entity();
    const alice = world.entity();
    const WildcardAlice = world.pair(world.wildcard, alice);
    expect(WildcardAlice).toBeDefined();

    bob.add([likes, alice]);
    expect(bob.has(WildcardAlice)).toBe(true);
    expect(Array.from(bob.components(WildcardAlice))).toIncludeSameMembers([
      world.pair(likes, alice),
    ]);
    expect(bob.findComponent(WildcardAlice)).toEqual(world.pair(likes, alice));
    bob.remove(WildcardAlice);
    expect(bob.has(WildcardAlice)).toBe(false);
    expect(bob.has([likes, alice])).toBe(false);
    expect(bob.has(WildcardAlice)).toBe(false);
    expect(Array.from(bob.components(WildcardAlice))).toIncludeSameMembers([]);
  });

  test("concrete double wildcard pairs can be created on the the world and used normally", () => {
    const world = new Fiecs.World();
    const likes = world.tag();
    const bob = world.entity();
    const alice = world.entity();
    const doubleWildcard = world.pair(world.wildcard, world.wildcard);
    expect(doubleWildcard).toBeDefined();

    bob.add([likes, alice]);
    expect(bob.has(doubleWildcard)).toBe(true);
    expect(Array.from(bob.components(doubleWildcard))).toIncludeSameMembers([
      world.pair(likes, alice),
    ]);
    expect(bob.findComponent(doubleWildcard)).toEqual(world.pair(likes, alice));
    bob.remove(doubleWildcard);
    expect(bob.has(doubleWildcard)).toBe(false);
    expect(bob.has([likes, alice])).toBe(false);
    expect(bob.has(doubleWildcard)).toBe(false);
    expect(Array.from(bob.components(doubleWildcard))).toIncludeSameMembers([]);
  });

  test("We can get the relationship and target for a pair as entities", () => {
    const world = new Fiecs.World();
    const likes = world.tag();
    const bob = world.entity();

    const likesBob = world.pair(likes, bob);

    expect(likesBob.first().isSameAs(likes)).toBe(true);
    expect(likesBob.second().isSameAs(bob)).toBe(true);
  });

  test("concrete relationships cannot be added as relationships of new pairs", () => {
    const world = new Fiecs.World();

    const likes = world.tag();
    const bob = world.entity();
    const alice = world.entity();
    const clint = world.entity();

    const LikesAlice = world.pair(likes, alice);

    expect(LikesAlice).toBeDefined();

    // @ts-expect-error // should not be allowed in ts, but needs to be tested
    expect(() => bob.add([LikesAlice, clint])).toThrow(
      "Cannot create a pair with an existing pair as relationship",
    );
  });

  test("Trying to create concrete relationships with entities that have been deleted throws", () => {
    const world = new Fiecs.World();

    const eats = world.tag();
    const apples = world.entity();

    eats.destruct();

    expect(() => world.pair(eats, apples)).toThrow(
      "Component does not exist in ECS",
    );
  });
});

test("We can get an entities' type", () => {
  const world = new Fiecs.World();
  const cheese = world.tag("cheese");
  const likes = world.tag("likes");

  const alice = world.entity("Alice");
  alice.add(likes);
  alice.add(cheese);
  alice.add([likes, cheese]);

  expect(alice.type()).toIncludeSameMembers([
    likes,
    cheese,
    world.pair(likes, cheese),
  ]);
});

test("We can check wether an entity, component or pair has data at runtime", () => {
  const world = new Fiecs.World();

  const e = world.entity("e");
  expect(e.hasData()).toBe(false);
  const tag = world.tag("tag");
  expect(tag.hasData()).toBe(false);
  const component = world.component(z.number()).setName("component");
  expect(component.hasData()).toBe(true);

  const erasedComponent = world.entity("component");
  expect(erasedComponent.hasData()).toBe(true);

  expect(world.pair(tag, e).hasData()).toBe(false);
  expect(world.pair("tag", e).hasData()).toBe(false);
  expect(world.pair(component, e).hasData()).toBe(true);
  expect(world.pair("component", e).hasData()).toBe(true);
});
