import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../index";
import { awaitGC, ObjectGCTracker } from "../Utility/GC.testutility";

describe("removeFromAll", () => {
  test("removeFromAll removes the removed entity from all that have added it, but not as parts of pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    bob.add(likes);
    bob.add([alice, likes]);
    clint.add(likes);
    clint.add([likes, alice]);

    world.removeFromAll(likes);

    expect(likes.isAlive()).toBe(true);

    expect(alice.has(likes)).toBe(false);
    expect(bob.has(likes)).toBe(false);
    expect(clint.has(likes)).toBe(false);
    expect(clint.has([likes, alice])).toBe(true);
    expect(bob.has([alice, likes])).toBe(true);
  });

  test("removeFromAll works for pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    bob.add(likes);
    bob.add([alice, likes]);
    clint.add(likes);
    clint.add([likes, alice]);

    world.removeFromAll([likes, alice]);

    expect(likes.isAlive()).toBe(true);

    expect(alice.has(likes)).toBe(true);
    expect(bob.has(likes)).toBe(true);
    expect(clint.has(likes)).toBe(true);
    expect(clint.has([likes, alice])).toBe(false);
    expect(bob.has([alice, likes])).toBe(true);
  });

  test("removeFromAll works for pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    const likesAlice = world.pair(likes, alice);

    alice.add(likes);
    bob.add(likes);
    bob.add([alice, likes]);
    clint.add(likes);
    clint.add([likes, alice]);

    world.removeFromAll(likesAlice);

    expect(likes.isAlive()).toBe(true);

    expect(alice.has(likes)).toBe(true);
    expect(bob.has(likes)).toBe(true);
    expect(clint.has(likes)).toBe(true);
    expect(clint.has([likes, alice])).toBe(false);
    expect(bob.has([alice, likes])).toBe(true);
  });

  test("removeFromAll throws if we try to removeFromAll with two parameters where the first is already a pair", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    const likesAlice = world.pair(likes, alice);

    alice.add(likes);
    bob.add(likes);
    bob.add([alice, likes]);
    clint.add(likes);
    clint.add([likes, alice]);

    // @ts-expect-error //should throw because overload is not acceptable
    expect(() => world.removeFromAll([likesAlice, alice])).toThrow();
  });

  test("removeFromAll removes any associated component data", () => {
    const world = new Fiecs.World();
    const likes = world.component(z.number().default(0));
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    bob.add(likes);
    bob.add([alice, likes]);
    clint.add(likes);
    clint.add([likes, alice]);

    world.removeFromAll(likes);

    expect(likes.isAlive()).toBe(true);

    expect(alice.get(likes)).toBeUndefined();
    expect(bob.get(likes)).toBeUndefined();
    expect(clint.get(likes)).toBeUndefined();
    expect(clint.get([likes, alice])).toBe(0);
    expect(bob.get([alice, likes])).toBe(0);
  });

  test("removeFromAll(relationship, wildcard) removes all pairs using the relationship", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    alice.add([likes, bob]);
    alice.add([likes, clint]);
    alice.add([bob, likes]);
    alice.add([clint, likes]);

    bob.add(likes);
    bob.add([likes, alice]);
    bob.add([likes, clint]);
    bob.add([alice, likes]);
    bob.add([clint, likes]);

    clint.add(likes);
    clint.add([likes, alice]);
    clint.add([likes, bob]);
    clint.add([alice, likes]);
    clint.add([bob, likes]);

    world.removeFromAll([likes, world.wildcard]);

    expect(alice.has(likes)).toBe(true);
    expect(alice.has([likes, bob])).toBe(false);
    expect(alice.has([likes, clint])).toBe(false);
    expect(alice.has([bob, likes])).toBe(true);
    expect(alice.has([clint, likes])).toBe(true);

    expect(bob.has(likes)).toBe(true);
    expect(bob.has([likes, alice])).toBe(false);
    expect(bob.has([likes, clint])).toBe(false);
    expect(bob.has([alice, likes])).toBe(true);
    expect(bob.has([clint, likes])).toBe(true);

    expect(clint.has(likes)).toBe(true);
    expect(clint.has([likes, alice])).toBe(false);
    expect(clint.has([likes, bob])).toBe(false);
    expect(clint.has([alice, likes])).toBe(true);
    expect(clint.has([bob, likes])).toBe(true);
  });
  test("removeFromAll(wildcard, target) removes all pairs targeting the target", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    alice.add([likes, bob]);
    alice.add([likes, clint]);
    alice.add([bob, likes]);
    alice.add([clint, likes]);

    bob.add(likes);
    bob.add([likes, alice]);
    bob.add([likes, clint]);
    bob.add([alice, likes]);
    bob.add([clint, likes]);

    clint.add(likes);
    clint.add([likes, alice]);
    clint.add([likes, bob]);
    clint.add([alice, likes]);
    clint.add([bob, likes]);

    world.removeFromAll([world.wildcard, likes]);

    expect(alice.has(likes)).toBe(true);
    expect(alice.has([likes, bob])).toBe(true);
    expect(alice.has([likes, clint])).toBe(true);
    expect(alice.has([bob, likes])).toBe(false);
    expect(alice.has([clint, likes])).toBe(false);

    expect(bob.has(likes)).toBe(true);
    expect(bob.has([likes, alice])).toBe(true);
    expect(bob.has([likes, clint])).toBe(true);
    expect(bob.has([alice, likes])).toBe(false);
    expect(bob.has([clint, likes])).toBe(false);

    expect(clint.has(likes)).toBe(true);
    expect(clint.has([likes, alice])).toBe(true);
    expect(clint.has([likes, bob])).toBe(true);
    expect(clint.has([alice, likes])).toBe(false);
    expect(clint.has([bob, likes])).toBe(false);
  });

  test("removeFromAll(wildcard) removes all user-added components, but not pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");
    const someOtherTag = world.tag("someOtherTag");

    alice.add(likes);
    alice.add([likes, bob]);
    alice.add([likes, clint]);
    alice.add([bob, likes]);
    alice.add([clint, likes]);
    alice.add(someOtherTag);

    bob.add(likes);
    bob.add([likes, alice]);
    bob.add([likes, clint]);
    bob.add([alice, likes]);
    bob.add([clint, likes]);
    bob.add(someOtherTag);

    clint.add(likes);
    clint.add([likes, alice]);
    clint.add([likes, bob]);
    clint.add([alice, likes]);
    clint.add([bob, likes]);
    clint.add(someOtherTag);

    world.removeFromAll(world.wildcard);

    expect(alice.has(likes)).toBe(false);
    expect(alice.has([likes, bob])).toBe(true);
    expect(alice.has([likes, clint])).toBe(true);
    expect(alice.has([bob, likes])).toBe(true);
    expect(alice.has([clint, likes])).toBe(true);
    expect(alice.has(someOtherTag)).toBe(false);

    expect(bob.has(likes)).toBe(false);
    expect(bob.has([likes, alice])).toBe(true);
    expect(bob.has([likes, clint])).toBe(true);
    expect(bob.has([alice, likes])).toBe(true);
    expect(bob.has([clint, likes])).toBe(true);
    expect(bob.has(someOtherTag)).toBe(false);

    expect(clint.has(likes)).toBe(false);
    expect(clint.has([likes, alice])).toBe(true);
    expect(clint.has([likes, bob])).toBe(true);
    expect(clint.has([alice, likes])).toBe(true);
    expect(clint.has([bob, likes])).toBe(true);
    expect(clint.has(someOtherTag)).toBe(false);
  });

  test("removeFromAll(wildcard, wildcard) removes all user-added pairs, but not components", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");
    const someOtherTag = world.tag("someOtherTag");

    alice.add(likes);
    alice.add([likes, bob]);
    alice.add([likes, clint]);
    alice.add([bob, likes]);
    alice.add([clint, likes]);
    alice.add(someOtherTag);

    bob.add(likes);
    bob.add([likes, alice]);
    bob.add([likes, clint]);
    bob.add([alice, likes]);
    bob.add([clint, likes]);
    bob.add(someOtherTag);

    clint.add(likes);
    clint.add([likes, alice]);
    clint.add([likes, bob]);
    clint.add([alice, likes]);
    clint.add([bob, likes]);
    clint.add(someOtherTag);

    world.removeFromAll([world.wildcard, world.wildcard]);

    expect(alice.has(likes)).toBe(true);
    expect(alice.has([likes, bob])).toBe(false);
    expect(alice.has([likes, clint])).toBe(false);
    expect(alice.has([bob, likes])).toBe(false);
    expect(alice.has([clint, likes])).toBe(false);
    expect(alice.has(someOtherTag)).toBe(true);

    expect(bob.has(likes)).toBe(true);
    expect(bob.has([likes, alice])).toBe(false);
    expect(bob.has([likes, clint])).toBe(false);
    expect(bob.has([alice, likes])).toBe(false);
    expect(bob.has([clint, likes])).toBe(false);
    expect(bob.has(someOtherTag)).toBe(true);

    expect(clint.has(likes)).toBe(true);
    expect(clint.has([likes, alice])).toBe(false);
    expect(clint.has([likes, bob])).toBe(false);
    expect(clint.has([alice, likes])).toBe(false);
    expect(clint.has([bob, likes])).toBe(false);
    expect(clint.has(someOtherTag)).toBe(true);
  });
});

describe("destructAllWith", () => {
  test("destructAllWith deletes all entities with a tag, but not those that have the tag as part of a pair", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const apples = world.entity();

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    bob.add([apples, likes]);
    clint.add([likes, apples]);

    world.destructAllWith(likes);

    expect(alice.isAlive()).toBe(false);
    expect(bob.isAlive()).toBe(true);
    expect(clint.isAlive()).toBe(true);
    expect(bob.has([apples, likes])).toBe(true);
    expect(clint.has([likes, apples])).toBe(true);
  });

  test("destructAllWith works for pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const apples = world.entity();

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    bob.add([apples, likes]);
    clint.add([likes, apples]);

    world.destructAllWith([likes, apples]);

    expect(alice.isAlive()).toBe(true);
    expect(bob.isAlive()).toBe(true);
    expect(clint.isAlive()).toBe(false);
    expect(bob.has([apples, likes])).toBe(true);
  });

  test("destructAllWith works for explicit pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const apples = world.entity();

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    const likesApples = world.pair(likes, apples);

    alice.add(likes);
    bob.add([apples, likes]);
    clint.add([likes, apples]);

    world.destructAllWith(likesApples);

    expect(alice.isAlive()).toBe(true);
    expect(bob.isAlive()).toBe(true);
    expect(clint.isAlive()).toBe(false);
    expect(bob.has([apples, likes])).toBe(true);
  });

  test("destructAllWith throws if we try to destructAllWith with two parameters where the first is already a pair", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const apples = world.entity();

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    const likesApples = world.pair(likes, apples);

    alice.add(likes);
    bob.add([apples, likes]);
    clint.add([likes, apples]);

    // @ts-expect-error //should throw because overload is not acceptable
    expect(() => world.destructAllWith([likesApples, alice])).toThrow(
      "Cannot create a pair with a pair as the relationship",
    );
  });

  test("destructAllWith removes associated archetypes and edges", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const apples = world.entity();

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    bob.add([apples, likes]);
    clint.add([likes, apples]);
    clint.add(likes);

    world.startStatistics();
    world.destructAllWith(likes);

    // remove [likes], [likes, (likes, apples)]
    expect(world.getStatistics().archetypesDeleted).toBe(2);
    // removes edges from [] to [likes], from [(likes, apples)] to [likes, (likes, apples)]
    expect(world.getStatistics().linksDeleted).toBe(4);
  });

  test("destructAllWith(relationship, wildcard) deletes all entities with pairs using the relationship", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    alice.add([bob, likes]);
    alice.add([clint, likes]);

    bob.add(likes);
    bob.add([likes, alice]);

    clint.add(likes);
    clint.add([likes, bob]);

    world.destructAllWith([likes, world.wildcard]);

    expect(alice.isAlive()).toBe(true);
    expect(bob.isAlive()).toBe(false);
    expect(clint.isAlive()).toBe(false);
  });
  test("destructAllWith(wildcard, target) destroys all entities that have pairs targeting the target", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    alice.add([likes, bob]);
    alice.add([likes, clint]);

    bob.add(likes);
    bob.add([alice, likes]);

    clint.add(likes);
    clint.add([bob, likes]);

    world.destructAllWith([world.wildcard, likes]);

    expect(alice.isAlive()).toBe(true);
    expect(bob.isAlive()).toBe(false);
    expect(clint.isAlive()).toBe(false);
  });

  test("destructAllWith(wildcard) destroys all entities that have components which are not pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    // alice.add(likes);
    alice.add([likes, bob]);
    alice.add([likes, clint]);

    bob.add(likes);
    // bob.add([alice, likes]);

    clint.add(likes);
    clint.add([bob, likes]);

    world.destructAllWith(world.wildcard);

    expect(alice.isAlive()).toBe(true);
    expect(bob.isAlive()).toBe(false);
    expect(clint.isAlive()).toBe(false);
  });

  test("destructAllWith(wildcard, wildcard) destroys all entities that have components which are pairs", () => {
    const world = new Fiecs.World();
    const likes = world.tag("likes");
    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes);
    // alice.add([likes, bob]);
    // alice.add([likes, clint]);

    // bob.add(likes);
    bob.add([likes, alice]);

    // clint.add(likes);
    clint.add([bob, likes]);

    world.destructAllWith([world.wildcard, world.wildcard]);

    expect(alice.isAlive()).toBe(true);
    expect(bob.isAlive()).toBe(false);
    expect(clint.isAlive()).toBe(false);
  });
});

describe("Cleanup on destruct", () => {
  test("Destructing a tag shows the tag to be nonalive", () => {
    const world = new Fiecs.World();

    const likes = world.tag("likes");
    expect(likes.isAlive()).toBe(true);

    likes.destruct();

    expect(likes.isAlive()).toBe(false);
  });

  test("trying to add a destructed tag to an entity throws", () => {
    const world = new Fiecs.World();
    const likes = world.tag();
    const bob = world.entity("Bob");
    likes.destruct();
    expect(() => bob.add(likes)).toThrow("Component does not exist in ECS");
  });

  test("Destructing a tag removes the tag from all entities", () => {
    const world = new Fiecs.World();

    const cheese = world.tag("cheese");
    const likes = world.tag("likes");

    const alice = world.entity("Alice");
    alice.add(likes);

    const bob = world.entity("Bob");
    bob.add(likes);
    bob.add(cheese);

    const clint = world.entity("Clint");
    clint.add(cheese);
    clint.add(likes);

    likes.destruct();

    expect(alice.has(likes)).toBe(false);
    expect(bob.has(likes)).toBe(false);
    expect(clint.has(likes)).toBe(false);
  });

  test("Destructing a tag removes all relationships that use the tag", () => {
    const world = new Fiecs.World();

    const cheese = world.tag("cheese");
    const likes = world.tag("likes");

    const alice = world.entity("Alice");

    const bob = world.entity("Bob");
    bob.add(cheese);
    bob.add([likes, alice]);

    const clint = world.entity("Clint");
    clint.add([likes, alice]);
    clint.add(cheese);

    likes.destruct();

    expect(bob.has([likes, alice])).toBe(false);
    expect(clint.has([likes, alice])).toBe(false);

    expect(alice.has([likes, world.wildcard])).toBe(false);
    expect(bob.has([likes, world.wildcard])).toBe(false);
    expect(clint.has([likes, world.wildcard])).toBe(false);
  });

  test("Destructing a tag that is used as both tag and relationship clears up both", () => {
    const world = new Fiecs.World();

    const likes = world.tag("likes");

    const alice = world.entity("Alice");
    alice.add(likes);

    const bob = world.entity("Bob");
    bob.add([likes, alice]);

    likes.destruct();

    expect(alice.has(likes)).toBe(false);
    expect(bob.has([likes, alice])).toBe(false);

    expect(alice.has([likes, world.wildcard])).toBe(false);
    expect(bob.has([likes, world.wildcard])).toBe(false);
  });

  test("Destructing a tag that is used as both tag and relationship on the same archetype clears up both", () => {
    const world = new Fiecs.World();

    const likes = world.tag("likes");

    const alice = world.entity("Alice");

    const bob = world.entity("Bob");
    alice.add(likes);
    bob.add([likes, alice]);

    likes.destruct();

    expect(bob.has(likes)).toBe(false);
    expect(bob.has([likes, alice])).toBe(false);

    expect(alice.has([likes, world.wildcard])).toBe(false);
    expect(bob.has([likes, world.wildcard])).toBe(false);
  });

  test("Destructing a tag removes all relationships that use the tag, even if there would be intermediate archetypes created", () => {
    const world = new Fiecs.World();

    const likes = world.tag("likes");

    const alice = world.entity("Alice");

    const bob = world.entity("Bob");
    bob.add(likes);
    bob.add([likes, alice]);

    // Archetypes that are there are [], [likes], [likes, (likes,alice)]
    // removing likes as tag first would create [(likes, alice)], which didn't exist before
    likes.destruct();

    expect(bob.has(likes)).toBe(false);
    expect(bob.has([likes, alice])).toBe(false);
  });

  test("Destructing a tag removes all archetypes and links using the tag", () => {
    const world = new Fiecs.World();

    const cheese = world.tag("cheese");
    const likes = world.tag("likes");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    world.startStatistics();
    alice.add(likes);
    expect(world.getStatistics().archetypesAdded).toBe(1);
    expect(world.getStatistics().linksAdded).toBe(2);

    world.startStatistics();
    bob.add(likes);
    expect(world.getStatistics().archetypesAdded).toBe(0);
    expect(world.getStatistics().linksAdded).toBe(0);

    world.startStatistics();
    bob.add(cheese);
    expect(world.getStatistics().archetypesAdded).toBe(1);
    expect(world.getStatistics().linksAdded).toBe(2);

    world.startStatistics();
    bob.add([likes, alice]);
    expect(world.getStatistics().archetypesAdded).toBe(1);
    expect(world.getStatistics().linksAdded).toBe(2);

    world.startStatistics();
    clint.add([likes, alice]);
    expect(world.getStatistics().archetypesAdded).toBe(1);
    expect(world.getStatistics().linksAdded).toBe(2);

    world.startStatistics();
    clint.add(likes);
    expect(world.getStatistics().archetypesAdded).toBe(1);
    expect(world.getStatistics().linksAdded).toBe(2);

    world.startStatistics();
    clint.add(cheese);
    expect(world.getStatistics().archetypesAdded).toBe(0);
    expect(world.getStatistics().linksAdded).toBe(2);

    world.startStatistics();
    likes.destruct();

    expect(world.getStatistics().archetypesDeleted).toBe(5);
    expect(world.getStatistics().linksDeleted).toBe(12);
  });

  // TODO[epic=memory] - need to check for memory leaks at some point
  test.skip("Destructed archetypes and edges are garbage collected", async () => {
    const world = new Fiecs.World();

    const likes = world.tag("likes");

    const alice = world.entity("Alice");

    world.startStatistics();
    alice.add(likes);

    expect(world.getStatistics().archetypesAdded).toBe(1);
    expect(world.getStatistics().linksAdded).toBe(2);
    likes.destruct();

    expect(world.getStatistics().archetypesDeleted).toBe(1);
    expect(world.getStatistics().linksDeleted).toBe(2);

    expect(world.getStatistics().liveArchetypes).toBe(1);
    expect(world.getStatistics().liveLinks).toBe(2);

    // expect(global.gc).toBeDefined();

    const testTracker = new ObjectGCTracker();

    (() => {
      let x = {};
      testTracker.add(x);
      x = null as unknown as object;
    })();

    expect(testTracker.count() === 1);
    await awaitGC(10);
    expect(testTracker.count() === 0);

    expect(world.getStatistics().liveArchetypes).toBe(0);
    expect(world.getStatistics().liveLinks).toBe(0);
  });

  test.skip("Destructed archetypes and edges are garbage collected", async () => {
    const world = new Fiecs.World();

    const cheese = world.tag("cheese");
    const likes = world.tag("likes");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    world.startStatistics();
    alice.add(likes);
    bob.add(likes);

    bob.add(cheese);
    bob.add([likes, alice]);

    clint.add([likes, alice]);
    clint.add(likes);
    clint.add(cheese);

    expect(world.getStatistics().archetypesAdded).toBe(5);
    expect(world.getStatistics().linksAdded).toBe(12);
    likes.destruct();

    expect(world.getStatistics().archetypesDeleted).toBe(5);
    expect(world.getStatistics().linksDeleted).toBe(12);

    expect(world.getStatistics().liveArchetypes).toBe(6);
    expect(world.getStatistics().liveLinks).toBe(12);

    // expect(global.gc).toBeDefined();

    const testTracker = new ObjectGCTracker();

    (() => {
      let x = {};
      testTracker.add(x);
      x = null as unknown as object;
    })();

    expect(testTracker.count() === 1);
    await awaitGC(10);
    expect(testTracker.count() === 0);

    expect(world.getStatistics().liveLinks).toBe(0);
    expect(world.getStatistics().liveArchetypes).toBe(0);
  });

  describe("Destructing an entity removes all relationships on other entities that target the destructed entity", () => {
    let world: Fiecs.World;
    let likes: Fiecs.Component<number>;
    let bob: Fiecs.Entity;
    let alice: Fiecs.Entity;

    beforeEach(() => {
      world = new Fiecs.World();
      likes = world.component(z.number().default(0));

      bob = world.entity("Bob");
      alice = world.entity("Alice");

      bob.add([likes, alice]);

      expect(bob.has([likes, alice])).toBe(true);

      alice.destruct();
    });

    test("", () => {
      expect(bob.has([likes, alice])).toBe(false);
    });
    test("", () => {
      expect(bob.has([likes, world.wildcard])).toBe(false);
    });
    test("", () => {
      expect(
        Array.from(bob.components([likes, world.wildcard])),
      ).toIncludeSameMembers([]);
    });
    test("", () => {
      expect(bob.findComponent([likes, world.wildcard])).toBeUndefined();
    });
    test("including data", () => {
      expect(bob.get([likes, alice])).toBeUndefined();
    });
  });

  test("Destructing an entity removes all archetypes and edges that previously had the entity as a target", () => {
    const world = new Fiecs.World();
    const likes = world.tag();

    const doofus = world.tag();

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    bob.add([likes, alice]);
    clint.add(doofus);
    clint.add([likes, alice]);

    expect(bob.has([likes, alice])).toBe(true);
    expect(clint.has([likes, alice])).toBe(true);

    world.startStatistics();
    alice.destruct();

    expect(bob.has([likes, alice])).toBe(false);

    expect(world.getStatistics().archetypesDeleted).toBe(2);
    expect(world.getStatistics().linksDeleted).toBe(4);
  });

  test("Trying to delete a component throws an error", () => {
    const world = new Fiecs.World();
    const health = world.component(z.number());
    expect(() => health.destruct()).toThrow(
      "Components cannot be destructed (by default)",
    );
  });

  //TODO[epic=hierarchies,seq=1] - Cleanup Traits: (OnDelete, Delete), (OnDeleteTarget, Delete), Panic for either
});
