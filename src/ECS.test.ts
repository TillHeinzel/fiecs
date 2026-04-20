import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "./index";
import { awaitGC, ObjectGCTracker } from "./Utility/GCtesting";

describe("entities, names, aliveness", () => {
  test("default constructor", () => {
    const ecs = new Fiecs.World();

    expect(ecs).toBeInstanceOf(Fiecs.World);
  });

  test("create new entity", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();

    expect(e).toBeDefined();
  });

  test("create new entity with name", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity("Bob");

    expect(e.getName()).toBe("Bob");
  });

  test("get original entity if name exists", () => {
    const ecs = new Fiecs.World();
    const e1 = ecs.entity("Bob");
    const e2 = ecs.entity("Bob");

    expect(e1.isSameAs(e2)).toBe(true);
  });

  test("lookup nonexistent name is undefined", () => {
    const ecs = new Fiecs.World();

    expect(ecs.lookupEntity("Bob")).toBeUndefined();
  });

  test("setting name to an already existing name throws", () => {
    const ecs = new Fiecs.World();
    ecs.entity("Bob");
    const e2 = ecs.entity();

    expect(() => e2.setName("Bob")).toThrow();
  });

  test("changing name means old name can no longer be used to lookup the entity", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity("Bob");
    expect(e.getName()).toBe("Bob");
    expect(ecs.lookupEntity("Bob")).toBeDefined();

    e.setName("Alice");

    expect(e.getName()).toBe("Alice");
    expect(ecs.lookupEntity("Bob")).toBeUndefined();
    expect(ecs.lookupEntity("Alice")).toBeDefined();
    expect(ecs.lookupEntity("Alice")!.getName()).toBe("Alice");
  });

  test("multiple entity objects target the same underlying data", () => {
    const ecs = new Fiecs.World();

    const e1 = ecs.entity("Bob");

    expect(e1.getName()).toBe("Bob");

    const e2 = ecs.lookupEntity("Bob");

    expect(e1).not.toBe(e2);
    expect(e1.isSameAs(e2!)).toBe(true);

    expect(e2).toBeDefined();
    expect(e2?.getName()).toBe("Bob");

    e1.setName("Alice");

    expect(e1.getName()).toBe("Alice");
    expect(e2!.getName()).toBe("Alice");
  });

  test("new entities are alive", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();

    expect(e.isAlive()).toBe(true);
  });

  test("destructed entities are not alive", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    e.destruct();

    expect(e.isAlive()).toBe(false);
  });

  test("destructed entities cannot be looked up", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity("Bob");
    e.destruct();

    expect(ecs.lookupEntity("Bob")).toBeUndefined();
  });

  test("destructed entities have no name", () => {
    const ecs = new Fiecs.World();

    const e = ecs.entity("Bob");
    e.destruct();
    expect(e.getName()).toBeUndefined();
  });

  test("destructing an entity removes all its tags", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();
    e.add(playerTag);
    e.add(aiTag);

    e.destruct();

    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("destructing an entity removes all its components", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number());
    const mana = ecs.component(z.number());
    e.set(health, 100);
    e.set(mana, 50);

    e.destruct();

    expect(e.has(health)).toBe(false);
    expect(e.has(mana)).toBe(false);
    expect(e.get(health)).toBeUndefined();
    expect(e.get(mana)).toBeUndefined();
  });

  test("destructing an entity removes all its relationship tags", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();

    const apples = ecs.entity();
    const pears = ecs.entity();

    const bob = ecs.entity();
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
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

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
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

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

    test("removeFromAll works for pairs", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      const likesAlice = ecs.pair(likes, alice);

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
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      const likesAlice = ecs.pair(likes, alice);

      alice.add(likes);
      bob.add(likes);
      bob.add(alice, likes);
      clint.add(likes);
      clint.add(likes, alice);

      // @ts-expect-error //should throw because overload is not acceptable
      expect(() => ecs.removeFromAll(likesAlice, alice)).toThrow();
    });

    test("removeFromAll removes any associated component data", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.component(z.number().default(0));
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

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

    test("removeFromAll(relationship, wildcard) removes all pairs using the relationship", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      alice.add(likes);
      alice.add(likes, bob);
      alice.add(likes, clint);
      alice.add(bob, likes);
      alice.add(clint, likes);

      bob.add(likes);
      bob.add(likes, alice);
      bob.add(likes, clint);
      bob.add(alice, likes);
      bob.add(clint, likes);

      clint.add(likes);
      clint.add(likes, alice);
      clint.add(likes, bob);
      clint.add(alice, likes);
      clint.add(bob, likes);

      ecs.removeFromAll(likes, ecs.wildcard);

      expect(alice.has(likes)).toBe(true);
      expect(alice.has(likes, bob)).toBe(false);
      expect(alice.has(likes, clint)).toBe(false);
      expect(alice.has(bob, likes)).toBe(true);
      expect(alice.has(clint, likes)).toBe(true);

      expect(bob.has(likes)).toBe(true);
      expect(bob.has(likes, alice)).toBe(false);
      expect(bob.has(likes, clint)).toBe(false);
      expect(bob.has(alice, likes)).toBe(true);
      expect(bob.has(clint, likes)).toBe(true);

      expect(clint.has(likes)).toBe(true);
      expect(clint.has(likes, alice)).toBe(false);
      expect(clint.has(likes, bob)).toBe(false);
      expect(clint.has(alice, likes)).toBe(true);
      expect(clint.has(bob, likes)).toBe(true);
    });
    test("removeFromAll(wildcard, target) removes all pairs targeting the target", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      alice.add(likes);
      alice.add(likes, bob);
      alice.add(likes, clint);
      alice.add(bob, likes);
      alice.add(clint, likes);

      bob.add(likes);
      bob.add(likes, alice);
      bob.add(likes, clint);
      bob.add(alice, likes);
      bob.add(clint, likes);

      clint.add(likes);
      clint.add(likes, alice);
      clint.add(likes, bob);
      clint.add(alice, likes);
      clint.add(bob, likes);

      ecs.removeFromAll(ecs.wildcard, likes);

      expect(alice.has(likes)).toBe(true);
      expect(alice.has(likes, bob)).toBe(true);
      expect(alice.has(likes, clint)).toBe(true);
      expect(alice.has(bob, likes)).toBe(false);
      expect(alice.has(clint, likes)).toBe(false);

      expect(bob.has(likes)).toBe(true);
      expect(bob.has(likes, alice)).toBe(true);
      expect(bob.has(likes, clint)).toBe(true);
      expect(bob.has(alice, likes)).toBe(false);
      expect(bob.has(clint, likes)).toBe(false);

      expect(clint.has(likes)).toBe(true);
      expect(clint.has(likes, alice)).toBe(true);
      expect(clint.has(likes, bob)).toBe(true);
      expect(clint.has(alice, likes)).toBe(false);
      expect(clint.has(bob, likes)).toBe(false);
    });

    test("removeFromAll(wildcard) removes all user-added components, but not pairs", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");
      const someOtherTag = ecs.tag("someOtherTag");

      alice.add(likes);
      alice.add(likes, bob);
      alice.add(likes, clint);
      alice.add(bob, likes);
      alice.add(clint, likes);
      alice.add(someOtherTag);

      bob.add(likes);
      bob.add(likes, alice);
      bob.add(likes, clint);
      bob.add(alice, likes);
      bob.add(clint, likes);
      bob.add(someOtherTag);

      clint.add(likes);
      clint.add(likes, alice);
      clint.add(likes, bob);
      clint.add(alice, likes);
      clint.add(bob, likes);
      clint.add(someOtherTag);

      ecs.removeFromAll(ecs.wildcard);

      expect(alice.has(likes)).toBe(false);
      expect(alice.has(likes, bob)).toBe(true);
      expect(alice.has(likes, clint)).toBe(true);
      expect(alice.has(bob, likes)).toBe(true);
      expect(alice.has(clint, likes)).toBe(true);
      expect(alice.has(someOtherTag)).toBe(false);

      expect(bob.has(likes)).toBe(false);
      expect(bob.has(likes, alice)).toBe(true);
      expect(bob.has(likes, clint)).toBe(true);
      expect(bob.has(alice, likes)).toBe(true);
      expect(bob.has(clint, likes)).toBe(true);
      expect(bob.has(someOtherTag)).toBe(false);

      expect(clint.has(likes)).toBe(false);
      expect(clint.has(likes, alice)).toBe(true);
      expect(clint.has(likes, bob)).toBe(true);
      expect(clint.has(alice, likes)).toBe(true);
      expect(clint.has(bob, likes)).toBe(true);
      expect(clint.has(someOtherTag)).toBe(false);
    });

    test("removeFromAll(wildcard, wildcard) removes all user-added pairs, but not components", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");
      const someOtherTag = ecs.tag("someOtherTag");

      alice.add(likes);
      alice.add(likes, bob);
      alice.add(likes, clint);
      alice.add(bob, likes);
      alice.add(clint, likes);
      alice.add(someOtherTag);

      bob.add(likes);
      bob.add(likes, alice);
      bob.add(likes, clint);
      bob.add(alice, likes);
      bob.add(clint, likes);
      bob.add(someOtherTag);

      clint.add(likes);
      clint.add(likes, alice);
      clint.add(likes, bob);
      clint.add(alice, likes);
      clint.add(bob, likes);
      clint.add(someOtherTag);

      ecs.removeFromAll(ecs.wildcard, ecs.wildcard);

      expect(alice.has(likes)).toBe(true);
      expect(alice.has(likes, bob)).toBe(false);
      expect(alice.has(likes, clint)).toBe(false);
      expect(alice.has(bob, likes)).toBe(false);
      expect(alice.has(clint, likes)).toBe(false);
      expect(alice.has(someOtherTag)).toBe(true);

      expect(bob.has(likes)).toBe(true);
      expect(bob.has(likes, alice)).toBe(false);
      expect(bob.has(likes, clint)).toBe(false);
      expect(bob.has(alice, likes)).toBe(false);
      expect(bob.has(clint, likes)).toBe(false);
      expect(bob.has(someOtherTag)).toBe(true);

      expect(clint.has(likes)).toBe(true);
      expect(clint.has(likes, alice)).toBe(false);
      expect(clint.has(likes, bob)).toBe(false);
      expect(clint.has(alice, likes)).toBe(false);
      expect(clint.has(bob, likes)).toBe(false);
      expect(clint.has(someOtherTag)).toBe(true);
    });
  });

  describe("destructAllWith", () => {
    test("destructAllWith deletes all entities with a tag, but not those that have the tag as part of a relationship", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const apples = ecs.entity();

      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

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
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const apples = ecs.entity();

      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

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
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const apples = ecs.entity();

      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      const likesApples = ecs.pair(likes, apples);

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
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const apples = ecs.entity();

      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      const likesApples = ecs.pair(likes, apples);

      alice.add(likes);
      bob.add(apples, likes);
      clint.add(likes, apples);

      // @ts-expect-error //should throw because overload is not acceptable
      expect(() => ecs.destructAllWith(likesApples, alice)).toThrow(
        "Cannot create a pair with a pair as the relationship",
      );
    });

    test("destructAllWith removes associated archetypes and edges", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const apples = ecs.entity();

      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      alice.add(likes);
      bob.add(apples, likes);
      clint.add(likes, apples);
      clint.add(likes);

      ecs.startStatistics();
      ecs.destructAllWith(likes);

      // remove [likes], [likes, (likes, apples)]
      expect(ecs.getStatistics().archetypesDeleted).toBe(2);
      // removes edges from [] to [likes], from [(likes, apples)] to [likes, (likes, apples)]
      expect(ecs.getStatistics().linksDeleted).toBe(4);
    });

    test("destructAllWith(relationship, wildcard) deletes all entities with pairs using the relationship", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      alice.add(likes);
      alice.add(bob, likes);
      alice.add(clint, likes);

      bob.add(likes);
      bob.add(likes, alice);

      clint.add(likes);
      clint.add(likes, bob);

      ecs.destructAllWith(likes, ecs.wildcard);

      expect(alice.isAlive()).toBe(true);
      expect(bob.isAlive()).toBe(false);
      expect(clint.isAlive()).toBe(false);
    });
    test("destructAllWith(wildcard, target) destroys all entities that have pairs targeting the target", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      alice.add(likes);
      alice.add(likes, bob);
      alice.add(likes, clint);

      bob.add(likes);
      bob.add(alice, likes);

      clint.add(likes);
      clint.add(bob, likes);

      ecs.destructAllWith(ecs.wildcard, likes);

      expect(alice.isAlive()).toBe(true);
      expect(bob.isAlive()).toBe(false);
      expect(clint.isAlive()).toBe(false);
    });

    test("destructAllWith(wildcard) destroys all entities that have components which are not pairs", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      // alice.add(likes);
      alice.add(likes, bob);
      alice.add(likes, clint);

      bob.add(likes);
      // bob.add(alice, likes);

      clint.add(likes);
      clint.add(bob, likes);

      ecs.destructAllWith(ecs.wildcard);

      expect(alice.isAlive()).toBe(true);
      expect(bob.isAlive()).toBe(false);
      expect(clint.isAlive()).toBe(false);
    });

    test("destructAllWith(wildcard, wildcard) destroys all entities that have components which are pairs", () => {
      const ecs = new Fiecs.World();
      const likes = ecs.tag("likes");
      const alice = ecs.entity("Alice");
      const bob = ecs.entity("Bob");
      const clint = ecs.entity("Clint");

      alice.add(likes);
      // alice.add(likes, bob);
      // alice.add(likes, clint);

      // bob.add(likes);
      bob.add(likes, alice);

      // clint.add(likes);
      clint.add(bob, likes);

      ecs.destructAllWith(ecs.wildcard, ecs.wildcard);

      expect(alice.isAlive()).toBe(true);
      expect(bob.isAlive()).toBe(false);
      expect(clint.isAlive()).toBe(false);
    });
  });
});

describe("tags", () => {
  test("Creating a tag ", () => {
    const ecs = new Fiecs.World();
    const c = ecs.tag();

    expect(c).toBeDefined();
  });

  test("A tag can be created with a name", () => {
    const ecs = new Fiecs.World();
    const player = ecs.tag("Player");

    expect(player.getName()).toBe("Player");
  });

  test("setting a tag requires it being created first", () => {
    const ecs = new Fiecs.World();
    const tag = ecs.tag();
    const e = ecs.entity();
    expect(() => e.add(tag)).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantTag = otherEcs.tag();
    expect(() => e.add(deviantTag)).toThrow("Component does not exist in ECS");
  });

  test("adding a tag to an entity will show that it has that tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();
    e.add(playerTag);

    expect(e.has(playerTag)).toBe(true);
    const aiTag = ecs.tag();
    expect(e.has(aiTag)).toBe(false);
  });

  test("adding a tag to an entity will show that it has with wildcard", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();
    expect(e.has(ecs.wildcard)).toBe(false);

    e.add(playerTag);
    expect(e.has(ecs.wildcard)).toBe(true);
  });

  test("adding a tag to an entity will NOT show that it has with [*,*], [tag, *] or [*, tag]", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();
    expect(e.has(ecs.wildcard, ecs.wildcard)).toBe(false);
    expect(e.has(playerTag, ecs.wildcard)).toBe(false);
    expect(e.has(ecs.wildcard, playerTag)).toBe(false);

    e.add(playerTag);
    expect(e.has(ecs.wildcard, ecs.wildcard)).toBe(false);
    expect(e.has(playerTag, ecs.wildcard)).toBe(false);
    expect(e.has(ecs.wildcard, playerTag)).toBe(false);
  });

  test("tags can be iterated over with components() ", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components());
    expect(comps).toIncludeSameMembers([playerTag, aiTag]);
  });

  test("components(tag) returns the correct component", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(playerTag));
    expect(comps).toIncludeSameMembers([playerTag]);
  });

  test("components(tag) returns nothing if the tag is not on the entity", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    // e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(playerTag));
    expect(comps).toIncludeSameMembers([]);
  });

  test("tags can be iterated over with components(*) ", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(ecs.wildcard));
    expect(comps).toIncludeSameMembers([playerTag, aiTag]);
  });

  test("tags will not be iterated over with components(*, *) ", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(ecs.wildcard, ecs.wildcard));
    expect(comps).toIncludeSameMembers([]);
  });

  test("tags will not be iterated over with components(tag, *) ", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(playerTag, ecs.wildcard));
    expect(comps).toIncludeSameMembers([]);
  });
  test("tags will not be iterated over with components(*, tag) ", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);

    const comps = Array.from(e.components(ecs.wildcard, aiTag));
    expect(comps).toIncludeSameMembers([]);
  });

  test("findComponent() will return an added tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();

    expect(e.findComponent()).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent()?.isSameAs(playerTag)).toBe(true);
  });

  test("findComponent(tag) will return an added tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();

    expect(e.findComponent(playerTag)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(playerTag)?.isSameAs(playerTag)).toBe(true);
  });

  test("findComponent(otherTag) will return an added tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    expect(e.findComponent(aiTag)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(aiTag)).toBeUndefined();
  });

  test("findComponent(*) will return an added tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();

    expect(e.findComponent(ecs.wildcard)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(ecs.wildcard)?.isSameAs(playerTag)).toBe(true);
  });

  test("findComponent(*, *) will not return an added tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();

    expect(e.findComponent(ecs.wildcard, ecs.wildcard)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(ecs.wildcard, ecs.wildcard)).toBeUndefined();
  });

  test("findComponent(tag, *) will not return an added tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();

    expect(e.findComponent(playerTag, ecs.wildcard)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(playerTag, ecs.wildcard)).toBeUndefined();
  });

  test("findComponent(*, tag) will not return an added tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();

    expect(e.findComponent(ecs.wildcard, playerTag)).toBeUndefined();

    e.add(playerTag);

    expect(e.findComponent(ecs.wildcard, playerTag)).toBeUndefined();
  });

  test("removing a tag from an entity will show that it no longer has that tag", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);

    e.remove(playerTag);
    expect(e.has(playerTag)).toBe(false);
  });

  test("removing * from an entity will remove any tags", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove(ecs.wildcard);
    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("removing [*,*] from an entity will not remove any tags", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove(ecs.wildcard, ecs.wildcard);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);
  });

  test("removing [tag,*] from an entity will not remove any tags", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove(playerTag, ecs.wildcard);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);
  });

  test("removing [*,tag] from an entity will not remove any tags", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    e.add(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);

    e.remove(ecs.wildcard, aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(true);
  });

  test("adding a tag twice changes nothing", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(e.has(aiTag)).toBe(false);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing tag the entity does not have does nothing", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();

    e.add(playerTag);
    expect(e.has(playerTag)).toBe(true);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    e.remove(aiTag);
    expect(e.has(playerTag)).toBe(true);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("clear removes all tags from the component", () => {
    const ecs = new Fiecs.World();
    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e = ecs.entity();
    e.add(playerTag);
    e.add(aiTag);
    e.clear();

    expect(e.has(playerTag)).toBe(false);
    expect(e.has(aiTag)).toBe(false);
  });

  test("Destructing a tag shows the tag to be nonalive", () => {
    const ecs = new Fiecs.World();

    const likes = ecs.tag("likes");
    expect(likes.isAlive()).toBe(true);

    likes.destruct();

    expect(likes.isAlive()).toBe(false);
  });

  test("trying to add a destructed tag to an entity throws", () => {
    const ecs = new Fiecs.World();
    const likes = ecs.tag();
    const bob = ecs.entity("Bob");
    likes.destruct();
    expect(() => bob.add(likes)).toThrow("Component does not exist in ECS");
  });

  test("adding a tag to two entities with the same original archetype only requires one expensive lookup ", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const playerTag = ecs.tag();
    const e1 = ecs.entity();
    const e2 = ecs.entity();
    expect(ecs.getStatistics().expensiveLookups).toBe(0);
    e1.add(playerTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
    e2.add(playerTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing a tag does not require additional expensive lookups, because links are created when the tag is added", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();

    const playerTag = ecs.tag();
    const e1 = ecs.entity();

    e1.add(playerTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    e1.remove(playerTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("when adding two tags and then removing the first, each operation adds a link", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();

    const playerTag = ecs.tag();
    const aiTag = ecs.tag();
    const e1 = ecs.entity();

    e1.add(playerTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    e1.add(aiTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(2);

    e1.remove(playerTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(3);
  });

  test("entities can be used as tags on other entities, as tags are just entities", () => {
    const ecs = new Fiecs.World();
    const bob = ecs.entity("Bob");
    const alice = ecs.entity("Alice");
    alice.add(bob);

    expect(alice.has(bob)).toBe(true);
  });

  test("Trying to set data on a tag throws", () => {
    const ecs = new Fiecs.World();
    const tag = ecs.tag("tag");
    const e = ecs.entity();
    // @ts-expect-error // should not be allowed in ts, but needs to be tested
    expect(() => e.set(tag, 5)).toThrow('"tag" has no data to be set');
  });
});

describe("statistics", () => {
  test("if statistics is started, can fetch statistics", () => {
    const ecs = new Fiecs.World();

    ecs.startStatistics();

    expect(ecs.getStatistics()).toBeDefined();
  });
  test("if statistics is not started, can't fetch statistics", () => {
    const ecs = new Fiecs.World();

    expect(() => ecs.getStatistics()).toThrow("Statistics not started");
  });

  test("if statistics is started then stopped, can't fetch statistics", () => {
    const ecs = new Fiecs.World();

    ecs.startStatistics();
    ecs.stopStatistics();

    expect(() => ecs.getStatistics()).toThrow("Statistics not started");
  });

  test("if statistics is started, expensive archetype lookups are counted", () => {
    const ecs = new Fiecs.World();
    const cheeseTag = ecs.tag();
    ecs.startStatistics();

    const e = ecs.entity();
    e.add(cheeseTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
    const breadTag = ecs.tag();
    e.add(breadTag);
    expect(ecs.getStatistics().expensiveLookups).toBe(2);
  });

  test("can lookup archetypes added", () => {
    const ecs = new Fiecs.World();
    const cheese = ecs.tag();

    ecs.startStatistics();
    const e = ecs.entity();
    e.add(cheese);
    expect(ecs.getStatistics().archetypesAdded).toEqual(1);

    e.add(cheese, e);
    expect(ecs.getStatistics().archetypesAdded).toEqual(2);
  });

  test("can lookup number of edges between archetypes", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const cheese = ecs.tag();
    const e = ecs.entity();

    ecs.startStatistics();
    e.add(cheese);
    expect(ecs.getStatistics().linksAdded).toEqual(2);

    ecs.startStatistics();
    e.add(cheese, e);
    expect(ecs.getStatistics().linksAdded).toEqual(2);

    ecs.startStatistics();
    e.remove(cheese);
    expect(ecs.getStatistics().linksAdded).toEqual(2);

    ecs.startStatistics();
    e.remove(cheese, e);
    expect(ecs.getStatistics().linksAdded).toEqual(2);
  });
});

describe("components", () => {
  test("Creating a component", () => {
    const ecs = new Fiecs.World();
    const c = ecs.component(z.number());

    expect(c).toBeDefined();
  });

  test("We can access the underlying initializer for a component", () => {
    const ecs = new Fiecs.World();
    const initializer = z.number().default(0);
    const c = ecs.component(initializer);
    expect(c.getInitializer()).toBe(initializer);
  });

  test("registering a component twice with the same initializer returns the same component", () => {
    const ecs = new Fiecs.World();

    const initializer = z.number();
    const c1 = ecs.component(initializer);
    const c2 = ecs.component(initializer);
    expect(c2.isSameAs(c1)).toBe(true);
  });

  test("adding a component requires it being created first", () => {
    const ecs = new Fiecs.World();
    const c = ecs.component(z.number().default(0));
    const e = ecs.entity();
    expect(() => e.add(c)).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantComponent = otherEcs.component(z.number().default(0));

    expect(() => e.add(deviantComponent)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("adding a component means that component can be gotten back", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number().default(0));

    e.add(health);
    expect(e.get(health)).toBe(0);
  });

  test("getting a non-existent component returns undefined", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number());
    expect(e.get(health)).toBeUndefined();
  });

  test("components are independent of each other", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number());
    const mana = ecs.component(z.number());
    e.set(health, 100);
    e.set(mana, 50);
    expect(e.get(health)).toBe(100);
    expect(e.get(mana)).toBe(50);
  });

  test("a component that has been added can be checked for existence", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number().default(0));
    e.add(health);
    expect(e.has(health)).toBe(true);
  });

  test("added components are returned with components(), but without type information", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number().default(0));
    const mana = ecs.component(z.number().default(0));
    e.add(health);
    e.add(mana);

    const comps = Array.from(e.components());
    expect(comps).toIncludeSameMembers([health, mana]);
  });

  test("removing a component means that component can no longer be gotten or checked for existence", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number().default(0));
    e.add(health);
    expect(e.has(health)).toBe(true);
    e.remove(health);
    expect(e.has(health)).toBe(false);
    expect(e.get(health)).toBeUndefined();
  });

  test("If a component doesn't have a default, add throws", () => {
    const ecs = new Fiecs.World();
    const health = ecs.component(z.number());
    health.setName("health");
    const e = ecs.entity();
    expect(() => e.add(health)).toThrow(
      'Component "health" cannot be default initialized',
    );
  });

  test("A components value can be set, and the updated value can be get", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number().default(0));
    e.add(health);
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("setting a component automatically adds it", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number().default(0));
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("set allows a component to have no default value", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number());
    e.set(health, 100);
    expect(e.get(health)).toBe(100);
  });

  test("Setting a component with a bad type throws an error", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number());
    // @ts-expect-error // this should throw because "not a number" is not a number
    expect(() => e.set(health, "not a number")).toThrow(
      "Invalid component data",
    );
  });

  test("Setting a component which doesn't fulfill the schema throws an error", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number().min(0).max(100));
    expect(() => e.set(health, -1)).toThrow("Invalid component data");
    expect(() => e.set(health, 101)).toThrow("Invalid component data");
  });

  test("Adding a component to an entity that already has it does nothing", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const health = ecs.component(z.number().default(100));
    const e = ecs.entity();
    e.set(health, 50);
    e.add(health);
    expect(e.get(health)).toBe(50);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("adding a component requires it being created first", () => {
    const ecs = new Fiecs.World();
    const c = ecs.component(z.number().default(0));
    const e = ecs.entity();
    expect(() => e.add(c)).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantComponent = otherEcs.component(z.number().default(0));

    expect(() => e.add(deviantComponent)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("clearing an entity removes all components from the entity", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();
    const health = ecs.component(z.number());
    const mana = ecs.component(z.number());
    e.set(health, 100);
    e.set(mana, 50);
    e.clear();
    expect(e.has(health)).toBe(false);
    expect(e.has(mana)).toBe(false);
    expect(e.get(health)).toBeUndefined();
    expect(e.get(mana)).toBeUndefined();
  });

  test("adding a component to two entities with the same original archetype only requires one expensive lookup", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();

    const health = ecs.component(z.number());

    const e1 = ecs.entity();
    const e2 = ecs.entity();
    expect(ecs.getStatistics().expensiveLookups).toBe(0);
    e1.set(health, 100);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
    e2.set(health, 50);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing a component from an entity does not require and expensive lookup, because links are established on add", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const health = ecs.component(z.number());
    const e1 = ecs.entity();
    e1.set(health, 100);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
    e1.remove(health);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("when adding two components and then removing the first, each operation adds a link", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const health = ecs.component(z.number());
    const damage = ecs.component(z.number());
    const e1 = ecs.entity();

    e1.set(health, 100);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    e1.set(damage, 50);
    expect(ecs.getStatistics().expensiveLookups).toBe(2);

    e1.remove(health);
    expect(ecs.getStatistics().expensiveLookups).toBe(3);
  });

  test("A component can be set to undefined", () => {
    const ecs = new Fiecs.World();
    const e = ecs.entity();

    const health = ecs.component({ parse: (x: number | undefined) => x });
    e.set(health, 100);
    expect(e.get(health)).toBe(100);

    e.set(health, undefined);
    expect(e.get(health)).toBeUndefined();
  });
});

describe("relationships", () => {
  test("adding a relationship tag requires a created Tag or Component", () => {
    const ecs = new Fiecs.World();
    const likes = ecs.tag();
    const bob = ecs.entity();
    const apples = ecs.entity();
    expect(() => bob.add(likes, apples)).not.toThrow();

    const otherEcs = new Fiecs.World();
    const deviantRelationshipTag = otherEcs.tag();
    expect(() => bob.add(deviantRelationshipTag, apples)).toThrow(
      "Component does not exist in ECS",
    );
  });

  test("adding a relationship tag to an entity will show that it has that relationship tag", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();

    const apples = ecs.entity();
    const pears = ecs.entity();

    const bob = ecs.entity();
    bob.add(eats, apples);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
  });

  test("adding a relationship tag to an entity will show that it has [*,*], [relationship, *], [*, target]", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();
    const apples = ecs.entity();
    const bob = ecs.entity();

    expect(bob.has(ecs.wildcard, ecs.wildcard)).toBe(false);
    expect(bob.has(eats, ecs.wildcard)).toBe(false);
    expect(bob.has(ecs.wildcard, apples)).toBe(false);

    bob.add(eats, apples);
    expect(bob.has(ecs.wildcard, ecs.wildcard)).toBe(true);
    expect(bob.has(eats, ecs.wildcard)).toBe(true);
    expect(bob.has(ecs.wildcard, apples)).toBe(true);
  });

  test("adding a relationship tag to an entity will NOT show that it has *", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();
    const apples = ecs.entity();
    const bob = ecs.entity();

    expect(bob.has(ecs.wildcard)).toBe(false);

    bob.add(eats, apples);
    expect(bob.has(ecs.wildcard)).toBe(false);
  });

  test("Added pairs will be returned by components()", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    const apples = ecs.entity();
    const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);
    bob.add(eats, pears);

    const comps = Array.from(bob.components());
    expect(comps).toIncludeSameMembers([
      ecs.pair(eats, apples),
      ecs.pair(eats, pears),
    ]);
  });

  test("Added pairs will not be returned by components(*)", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    const apples = ecs.entity();
    const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);
    bob.add(eats, pears);

    const comps = Array.from(bob.components(ecs.wildcard));
    expect(comps).toIncludeSameMembers([]);
  });

  test("Added pairs will be returned by components(*,*)", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    const apples = ecs.entity();
    const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);
    bob.add(eats, pears);

    const comps = Array.from(bob.components(ecs.wildcard, ecs.wildcard));
    expect(comps).toIncludeSameMembers([
      ecs.pair(eats, apples),
      ecs.pair(eats, pears),
    ]);
  });

  test("Added pairs will be suitably returned by components(relationship,*)", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    const likes = ecs.tag();
    const apples = ecs.entity();
    const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);
    bob.add(eats, pears);
    bob.add(likes, apples);
    bob.add(likes, pears);

    const comps = Array.from(bob.components(eats, ecs.wildcard));
    expect(comps).toIncludeSameMembers([
      ecs.pair(eats, apples),
      ecs.pair(eats, pears),
    ]);
  });

  test("Added pairs will be suitably returned by components(relationship,*)", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    const likes = ecs.tag();
    const apples = ecs.entity();
    const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);
    bob.add(eats, pears);
    bob.add(likes, apples);
    bob.add(likes, pears);

    const comps = Array.from(bob.components(ecs.wildcard, apples));
    expect(comps).toIncludeSameMembers([
      ecs.pair(eats, apples),
      ecs.pair(likes, apples),
    ]);
  });

  test("findComponent() will return an added pair", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    // const likes = ecs.tag();
    const apples = ecs.entity();
    // const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);

    expect(bob.findComponent()?.isSameAs(ecs.pair(eats, apples))).toBe(true);
  });

  test("findComponent(*) will not return an added pair", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    // const likes = ecs.tag();
    const apples = ecs.entity();
    // const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);

    expect(bob.findComponent(ecs.wildcard)).toBeUndefined();
  });

  test("removing a relationship tag from an entity will show that it no longer has that relationship tag, without affecting other relationships", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();
    const apples = ecs.entity("apples");
    const pears = ecs.entity("pears");
    const bob = ecs.entity("bob");

    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);

    bob.remove(eats, apples);

    expect(bob.has(eats, apples)).toBe(false);
    expect(bob.has(eats, pears)).toBe(true);
  });

  test("removing [*,*] from an entity will remove all relationships", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();
    const apples = ecs.entity("apples");
    const pears = ecs.entity("pears");
    const bob = ecs.entity("bob");

    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);

    bob.remove(ecs.wildcard, ecs.wildcard);

    expect(bob.has(eats, apples)).toBe(false);
    expect(bob.has(eats, pears)).toBe(false);
  });

  test("removing [relationship,*] from an entity will remove all pairs with that relationship", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();
    const likes = ecs.tag();
    const apples = ecs.entity("apples");
    const pears = ecs.entity("pears");
    const bob = ecs.entity("bob");

    bob.add(eats, apples);
    bob.add(eats, pears);
    bob.add(likes, apples);
    bob.add(likes, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);
    expect(bob.has(likes, apples)).toBe(true);
    expect(bob.has(likes, pears)).toBe(true);

    bob.remove(likes, ecs.wildcard);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);
    expect(bob.has(likes, apples)).toBe(false);
    expect(bob.has(likes, pears)).toBe(false);
  });

  test("removing [*,target] from an entity will remove all pairs with that target", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();
    const likes = ecs.tag();
    const apples = ecs.entity("apples");
    const pears = ecs.entity("pears");
    const bob = ecs.entity("bob");

    bob.add(eats, apples);
    bob.add(eats, pears);
    bob.add(likes, apples);
    bob.add(likes, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);
    expect(bob.has(likes, apples)).toBe(true);
    expect(bob.has(likes, pears)).toBe(true);

    bob.remove(ecs.wildcard, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(bob.has(likes, apples)).toBe(true);
    expect(bob.has(likes, pears)).toBe(false);
  });

  test("adding a relationship tag twice does nothing quietly", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();

    const eats = ecs.tag();

    const apples = ecs.entity();
    const pears = ecs.entity();

    const bob = ecs.entity();
    bob.add(eats, apples);
    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    bob.add(eats, apples);
    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing non-existant relationship tag does nothing quietly", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();

    const eats = ecs.tag();
    const apples = ecs.entity();
    const pears = ecs.entity();
    const bob = ecs.entity();

    bob.add(eats, apples);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    bob.remove(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(false);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("clear removes all relationship tags from the entity", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();

    const apples = ecs.entity();
    const pears = ecs.entity();

    const bob = ecs.entity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, pears)).toBe(true);

    bob.clear();

    expect(bob.has(eats, apples)).toBe(false);
    expect(bob.has(eats, pears)).toBe(false);
  });

  test("adding a relationship tag to an entity will show that it has any of that relationship tag", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();

    const apples = ecs.entity();

    const bob = ecs.entity();
    bob.add(eats, apples);

    expect(bob.has(eats, ecs.wildcard)).toBe(true);
  });

  test("removing the last of a relationship type will show that the entity no longer has that relationship tag", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();

    const apples = ecs.entity();
    const pears = ecs.entity();

    const bob = ecs.entity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(bob.has(eats, ecs.wildcard)).toBe(true);

    bob.remove(eats, apples);

    expect(bob.has(eats, ecs.wildcard)).toBe(true);

    bob.remove(eats, pears);

    expect(bob.has(eats, ecs.wildcard)).toBe(false);
  });

  test("we can get the first added target for a relationship tag on an entity", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.tag();
    const apples = ecs.entity();
    const pears = ecs.entity();

    const bob = ecs.entity();
    bob.add(eats, apples);
    bob.add(eats, pears);

    expect(
      bob.findComponent(eats, ecs.wildcard)!.isSameAs(ecs.pair(eats, apples)),
    ).toBe(true);

    bob.remove(eats, apples);

    expect(
      bob.findComponent(eats, ecs.wildcard)!.isSameAs(ecs.pair(eats, pears)),
    ).toBe(true);
  });

  test("adding a relationship tag to two entities with the same original archetype only requires one expensive lookup", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();
    const relatesTo = ecs.tag();
    const e1 = ecs.entity();
    const e2 = ecs.entity();
    const e3 = ecs.entity();
    expect(ecs.getStatistics().expensiveLookups).toBe(0);
    e1.add(relatesTo, e3);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
    e2.add(relatesTo, e3);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("removing a relationship tag from an entity requires no additional expensive lookups because links are established on add", () => {
    const ecs = new Fiecs.World();
    ecs.startStatistics();

    const likes = ecs.tag();
    const bob = ecs.entity();
    const alice = ecs.entity();

    bob.add(likes, alice);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);

    bob.remove(likes, alice);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  test("Relationships can be components", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.component(z.number().default(0));
    const bob = ecs.entity();
    const apples = ecs.entity();

    bob.add(eats, apples);

    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, ecs.wildcard)).toBe(true);
    expect(Array.from(bob.components(eats, ecs.wildcard))).toIncludeSameMembers(
      [ecs.pair(eats, apples)],
    );
    expect(
      bob.findComponent(eats, ecs.wildcard)?.isSameAs(ecs.pair(eats, apples)),
    ).toBe(true);
  });

  test("Added relationship components can be get like normal components", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.component(z.number().default(0));
    const bob = ecs.entity();
    const apples = ecs.entity();

    bob.add(eats, apples);
    expect(bob.get(eats, apples)).toBe(0);
  });

  test("Relationship components can be set and get like normal components", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.component(z.number().default(0));
    const bob = ecs.entity();
    const apples = ecs.entity();

    bob.set(eats, apples, 5);
    expect(bob.get(eats, apples)).toBe(5);
  });

  test("If the target for a tag-relationship is a component, it's data is used", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.component(z.number().default(0));
    const bob = ecs.entity();
    const apples = ecs.entity();

    bob.set(apples, eats, 5);
    expect(bob.get(apples, eats)).toBe(5);
  });

  test("If both the first and second parts of a relationship are components, the associated data belongs to the first one", () => {
    const ecs = new Fiecs.World();
    const eats = ecs.component(z.number().default(0));
    const bob = ecs.entity();
    const apples = ecs.component(z.string().default(""));

    bob.set(eats, apples, 5);
    expect(bob.get(eats, apples)).toBe(5);

    bob.set(apples, eats, "test");
    expect(bob.get(apples, eats)).toBe("test");
  });

  test("concrete relationships can be created on the the ecs and world like tags & components", () => {
    const ecs = new Fiecs.World();

    const likes = ecs.tag();
    const bob = ecs.entity();
    const alice = ecs.entity();

    const bobLikesAlice = ecs.pair(likes, alice);

    expect(bobLikesAlice).toBeDefined();

    bob.add(bobLikesAlice);

    expect(bob.has(bobLikesAlice)).toBe(true);
    expect(bob.has(likes, alice)).toBe(true);
    expect(bob.has(likes, ecs.wildcard)).toBe(true);
    expect(
      Array.from(bob.components(likes, ecs.wildcard)),
    ).toIncludeSameMembers([ecs.pair(likes, alice)]);

    bob.remove(bobLikesAlice);

    expect(bob.has(bobLikesAlice)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);
    expect(bob.has(likes, ecs.wildcard)).toBe(false);
    expect(
      Array.from(bob.components(likes, ecs.wildcard)),
    ).toIncludeSameMembers([]);

    const eats = ecs.component(z.number().default(0));
    const apples = ecs.entity();

    const bobEatsApples = ecs.pair(eats, apples);

    bob.set(bobEatsApples, 5);

    expect(bob.has(bobEatsApples)).toBe(true);
    expect(bob.has(eats, apples)).toBe(true);
    expect(bob.has(eats, ecs.wildcard)).toBe(true);
    expect(Array.from(bob.components(eats, ecs.wildcard))).toIncludeSameMembers(
      [ecs.pair(eats, apples)],
    );
    expect(
      bob.findComponent(eats, ecs.wildcard)?.isSameAs(ecs.pair(eats, apples)),
    ).toBe(true);
    expect(bob.get(bobEatsApples)).toBe(5);
  });

  test("We can get the relationship and target for a pair as entities", () => {
    const ecs = new Fiecs.World();
    const likes = ecs.tag();
    const bob = ecs.entity();

    const likesBob = ecs.pair(likes, bob);

    expect(likesBob.relationship().isSameAs(likes)).toBe(true);
    expect(likesBob.target().isSameAs(bob)).toBe(true);
  });

  test("concrete relationships cannot be added as relationships of new pairs", () => {
    const ecs = new Fiecs.World();

    const likes = ecs.tag();
    const bob = ecs.entity();
    const alice = ecs.entity();
    const clint = ecs.entity();

    const LikesAlice = ecs.pair(likes, alice);

    expect(LikesAlice).toBeDefined();

    // @ts-expect-error // should not be allowed in ts, but needs to be tested
    expect(() => bob.add(LikesAlice, clint)).toThrow("Bad arguments for add");
  });

  test("Trying to create concrete relationships with entities that have been deleted throws", () => {
    const ecs = new Fiecs.World();

    const eats = ecs.tag();
    const apples = ecs.entity();

    eats.destruct();

    expect(() => ecs.pair(eats, apples)).toThrow(
      "Component does not exist in ECS",
    );
  });
});

describe("Cleanup on destruct", () => {
  test("Destructing a tag removes the tag from all entities", () => {
    const ecs = new Fiecs.World();

    const cheese = ecs.tag("cheese");
    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");
    alice.add(likes);

    const bob = ecs.entity("Bob");
    bob.add(likes);
    bob.add(cheese);

    const clint = ecs.entity("Clint");
    clint.add(cheese);
    clint.add(likes);

    likes.destruct();

    expect(alice.has(likes)).toBe(false);
    expect(bob.has(likes)).toBe(false);
    expect(clint.has(likes)).toBe(false);
  });

  test("Destructing a tag removes all relationships that use the tag", () => {
    const ecs = new Fiecs.World();

    const cheese = ecs.tag("cheese");
    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");

    const bob = ecs.entity("Bob");
    bob.add(cheese);
    bob.add(likes, alice);

    const clint = ecs.entity("Clint");
    clint.add(likes, alice);
    clint.add(cheese);

    likes.destruct();

    expect(bob.has(likes, alice)).toBe(false);
    expect(clint.has(likes, alice)).toBe(false);

    expect(alice.has(likes, ecs.wildcard)).toBe(false);
    expect(bob.has(likes, ecs.wildcard)).toBe(false);
    expect(clint.has(likes, ecs.wildcard)).toBe(false);
  });

  test("Destructing a tag that is used as both tag and relationship clears up both", () => {
    const ecs = new Fiecs.World();

    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");
    alice.add(likes);

    const bob = ecs.entity("Bob");
    bob.add(likes, alice);

    likes.destruct();

    expect(alice.has(likes)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);

    expect(alice.has(likes, ecs.wildcard)).toBe(false);
    expect(bob.has(likes, ecs.wildcard)).toBe(false);
  });

  test("Destructing a tag that is used as both tag and relationship on the same archetype clears up both", () => {
    const ecs = new Fiecs.World();

    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");

    const bob = ecs.entity("Bob");
    alice.add(likes);
    bob.add(likes, alice);

    likes.destruct();

    expect(bob.has(likes)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);

    expect(alice.has(likes, ecs.wildcard)).toBe(false);
    expect(bob.has(likes, ecs.wildcard)).toBe(false);
  });

  test("Destructing a tag removes all relationships that use the tag, even if there would be intermediate archetypes created", () => {
    const ecs = new Fiecs.World();

    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");

    const bob = ecs.entity("Bob");
    bob.add(likes);
    bob.add(likes, alice);

    // Archetypes that are there are [], [likes], [likes, (likes,alice)]
    // removing likes as tag first would create [(likes, alice)], which didn't exist before
    likes.destruct();

    expect(bob.has(likes)).toBe(false);
    expect(bob.has(likes, alice)).toBe(false);
  });

  test("Destructing a tag removes all archetypes and links using the tag", () => {
    const ecs = new Fiecs.World();

    const cheese = ecs.tag("cheese");
    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");
    const bob = ecs.entity("Bob");
    const clint = ecs.entity("Clint");

    ecs.startStatistics();
    alice.add(likes);
    expect(ecs.getStatistics().archetypesAdded).toBe(1);
    expect(ecs.getStatistics().linksAdded).toBe(2);

    ecs.startStatistics();
    bob.add(likes);
    expect(ecs.getStatistics().archetypesAdded).toBe(0);
    expect(ecs.getStatistics().linksAdded).toBe(0);

    ecs.startStatistics();
    bob.add(cheese);
    expect(ecs.getStatistics().archetypesAdded).toBe(1);
    expect(ecs.getStatistics().linksAdded).toBe(2);

    ecs.startStatistics();
    bob.add(likes, alice);
    expect(ecs.getStatistics().archetypesAdded).toBe(1);
    expect(ecs.getStatistics().linksAdded).toBe(2);

    ecs.startStatistics();
    clint.add(likes, alice);
    expect(ecs.getStatistics().archetypesAdded).toBe(1);
    expect(ecs.getStatistics().linksAdded).toBe(2);

    ecs.startStatistics();
    clint.add(likes);
    expect(ecs.getStatistics().archetypesAdded).toBe(1);
    expect(ecs.getStatistics().linksAdded).toBe(2);

    ecs.startStatistics();
    clint.add(cheese);
    expect(ecs.getStatistics().archetypesAdded).toBe(0);
    expect(ecs.getStatistics().linksAdded).toBe(2);

    ecs.startStatistics();
    likes.destruct();

    expect(ecs.getStatistics().archetypesDeleted).toBe(5);
    expect(ecs.getStatistics().linksDeleted).toBe(12);
  });

  // TODO[epic=memory] - need to check for memory leaks at some point
  test.skip("Destructed archetypes and edges are garbage collected", async () => {
    const ecs = new Fiecs.World();

    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");

    ecs.startStatistics();
    alice.add(likes);

    expect(ecs.getStatistics().archetypesAdded).toBe(1);
    expect(ecs.getStatistics().linksAdded).toBe(2);
    likes.destruct();

    expect(ecs.getStatistics().archetypesDeleted).toBe(1);
    expect(ecs.getStatistics().linksDeleted).toBe(2);

    expect(ecs.getStatistics().liveArchetypes).toBe(1);
    expect(ecs.getStatistics().liveLinks).toBe(2);

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

    expect(ecs.getStatistics().liveArchetypes).toBe(0);
    expect(ecs.getStatistics().liveLinks).toBe(0);
  });

  test.skip("Destructed archetypes and edges are garbage collected", async () => {
    const ecs = new Fiecs.World();

    const cheese = ecs.tag("cheese");
    const likes = ecs.tag("likes");

    const alice = ecs.entity("Alice");
    const bob = ecs.entity("Bob");
    const clint = ecs.entity("Clint");

    ecs.startStatistics();
    alice.add(likes);
    bob.add(likes);

    bob.add(cheese);
    bob.add(likes, alice);

    clint.add(likes, alice);
    clint.add(likes);
    clint.add(cheese);

    expect(ecs.getStatistics().archetypesAdded).toBe(5);
    expect(ecs.getStatistics().linksAdded).toBe(12);
    likes.destruct();

    expect(ecs.getStatistics().archetypesDeleted).toBe(5);
    expect(ecs.getStatistics().linksDeleted).toBe(12);

    expect(ecs.getStatistics().liveArchetypes).toBe(6);
    expect(ecs.getStatistics().liveLinks).toBe(12);

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

    expect(ecs.getStatistics().liveLinks).toBe(0);
    expect(ecs.getStatistics().liveArchetypes).toBe(0);
  });

  describe("Destructing an entity removes all relationships on other entities that target the destructed entity", () => {
    let ecs: Fiecs.World;
    let likes: Fiecs.Component<z.ZodDefault<z.ZodNumber>>;
    let bob: Fiecs.Entity;
    let alice: Fiecs.Entity;

    beforeEach(() => {
      ecs = new Fiecs.World();
      likes = ecs.component(z.number().default(0));

      bob = ecs.entity("Bob");
      alice = ecs.entity("Alice");

      bob.add(likes, alice);

      expect(bob.has(likes, alice)).toBe(true);

      alice.destruct();
    });

    test("", () => {
      expect(bob.has(likes, alice)).toBe(false);
    });
    test("", () => {
      expect(bob.has(likes, ecs.wildcard)).toBe(false);
    });
    test("", () => {
      expect(
        Array.from(bob.components(likes, ecs.wildcard)),
      ).toIncludeSameMembers([]);
    });
    test("", () => {
      expect(bob.findComponent(likes, ecs.wildcard)).toBeUndefined();
    });
    test("including data", () => {
      expect(bob.get(likes, alice)).toBeUndefined();
    });
  });

  test("Destructing an entity removes all archetypes and edges that previously had the entity as a target", () => {
    const ecs = new Fiecs.World();
    const likes = ecs.tag();

    const doofus = ecs.tag();

    const alice = ecs.entity("Alice");
    const bob = ecs.entity("Bob");
    const clint = ecs.entity("Clint");

    bob.add(likes, alice);
    clint.add(doofus);
    clint.add(likes, alice);

    expect(bob.has(likes, alice)).toBe(true);
    expect(clint.has(likes, alice)).toBe(true);

    ecs.startStatistics();
    alice.destruct();

    expect(bob.has(likes, alice)).toBe(false);

    expect(ecs.getStatistics().archetypesDeleted).toBe(2);
    expect(ecs.getStatistics().linksDeleted).toBe(4);
  });

  test("Trying to delete a component throws an error", () => {
    const ecs = new Fiecs.World();
    const health = ecs.component(z.number());
    expect(() => health.destruct()).toThrow(
      "Components cannot be destructed (by default)",
    );
  });

  //TODO[epic=hierarchies,seq=1] - Cleanup Traits: (OnDelete, Delete), (OnDeleteTarget, Delete), Panic for either
});

describe("With trait", () => {
  test("The ecs has a built-in component called with", () => {
    const ecs = new Fiecs.World();

    expect(ecs.builtin.With).toBeDefined();
    expect(ecs.builtin.With).toBeInstanceOf(Fiecs.Entity);
  });

  test("With is a trait, a relationship, acyclic, cannot have data, and only works with targets that can be default initialized", () => {
    const ecs = new Fiecs.World();

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
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("With-trait works when adding implicitly", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.set(power, "amazing");

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("A component can have multiple With's", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();
    const rogues = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(rogues)).toBe(true);
  });

  test("Withs can be chained", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag("power");
    const responsibility = ecs.tag("responsibility");
    const stress = ecs.tag("stress");

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    peterParker.add(power);

    expect(peterParker.has(power)).toBe(true);
    expect(peterParker.has(responsibility)).toBe(true);
    expect(peterParker.has(stress)).toBe(true);
  });

  test("Withs can be chained multiple times", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();
    const stress = ecs.tag();
    const sadness = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

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
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();
    const stress = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    ecs.startStatistics();
    peterParker.add(power);

    expect(ecs.getStatistics().archetypesAdded).toBe(1);
  });

  test("When with adds components with data, these are default initialized ", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.component(z.string().default("great"));
    const rogues = ecs.component(z.string().default("lots"));

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.add(power);

    expect(peterParker.get(responsibility)).toBe("great");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("When with adds components with data, these are default initialized when implicitly added", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.component(z.string().default("great"));
    const rogues = ecs.component(z.string().default("lots"));

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.set(power, "amazing");

    expect(peterParker.get(responsibility)).toBe("great");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("When with adds components with data, which are already on the entity, these are not modified ", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.component(z.string().default("great"));
    const rogues = ecs.component(z.string().default("lots"));

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    power.add(ecs.builtin.With, rogues);

    peterParker.set(responsibility, "huge");
    peterParker.add(power);

    expect(peterParker.get(responsibility)).toBe("huge");
    expect(peterParker.get(rogues)).toBe("lots");
  });

  test("Removing a trait with a with does not remove the withed trait", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(power);

    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("Removing a trait added due to With also removes the trait that has the With", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
  });

  test("Removing a withed trait works recursively", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();
    const stress = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    peterParker.add(power);
    peterParker.remove(stress);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(stress)).toBe(false);
  });

  test("Removing the middle of a with chain clears only the upstream", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();
    const stress = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);
    responsibility.add(ecs.builtin.With, stress);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(stress)).toBe(true);
  });

  test("Removing a component due to its With being removed also clears out the data", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(responsibility);

    expect(peterParker.has(responsibility)).toBe(false);
    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.get(power)).toBeUndefined();
  });

  test("A component that is target of With can be added and removed normally, if the With-relationship is not used", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.tag();
    power.add(ecs.builtin.With, responsibility);

    const peterPorker = ecs.entity("Peter Porker");

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
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();

    const great = ecs.entity("great");
    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power, great);

    expect(peterParker.has(power, great)).toBe(true);
    expect(peterParker.has(responsibility, great)).toBe(true);
  });

  test("Adding the with-trait to a relationship means that the withed-component will be added automatically with the same target on implicit add", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.tag();

    const great = ecs.entity("great");
    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.set(power, great, "amazing");

    expect(peterParker.has(power, great)).toBe(true);
    expect(peterParker.has(responsibility, great)).toBe(true);
  });

  test("Removing a relationship added through with automatically removes the source-relationship", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();

    const great = ecs.entity("great");
    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power, great);
    peterParker.remove(responsibility, great);

    expect(peterParker.has(power, great)).toBe(false);
    expect(peterParker.has(responsibility, great)).toBe(false);
  });

  test("Removing a component that has a With does not remove the withed component", () => {
    const ecs = new Fiecs.World();
    const power = ecs.component(z.string().default("great"));
    const responsibility = ecs.component(z.string().default("great"));

    const peterParker = ecs.entity("Peter Parker");

    power.add(ecs.builtin.With, responsibility);

    peterParker.add(power);
    peterParker.remove(power);

    expect(peterParker.has(power)).toBe(false);
    expect(peterParker.has(responsibility)).toBe(true);
  });

  test("Removing a component that is added due to with by multiple origins also removes all the components withing it", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const money = ecs.tag();
    const responsibility = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

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
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();
    const rogues = ecs.tag();

    const peterParker = ecs.entity("Peter Parker");

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
    const ecs = new Fiecs.World();
    expect(ecs.builtin.Relationship.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A component marked as a Relationship cannot be added as a component", () => {
    const ecs = new Fiecs.World();
    const relationshipComponent = ecs.tag("relationship component");
    relationshipComponent.add(ecs.builtin.Relationship);

    const e = ecs.entity();
    expect(() => e.add(relationshipComponent)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a component',
    );
  });

  test("A component marked as a Relationship cannot be added as a target in a relationship", () => {
    const ecs = new Fiecs.World();
    const markedRelationship = ecs.tag("relationship component");
    markedRelationship.add(ecs.builtin.Relationship);

    const tag = ecs.tag("some other relationship");

    const e = ecs.entity();
    expect(() => e.add(tag, markedRelationship)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a target of a relationship',
    );
  });

  test("A component marked as a Relationship CAN be added as a target in a relationship if the relationship is a Trait", () => {
    const ecs = new Fiecs.World();
    const markedRelationship = ecs.tag("relationship component");
    markedRelationship.add(ecs.builtin.Relationship);

    const trait = ecs.tag("some other relationship");
    trait.add(ecs.builtin.Trait);

    const e = ecs.entity();
    expect(() => e.add(trait, markedRelationship)).not.toThrow();
  });
});

describe("RelationshipHasNoData trait", () => {
  test("RelationshipHasNoData is a Trait", () => {
    const ecs = new Fiecs.World();
    expect(ecs.builtin.RelationshipHasNoData.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A relationship marked as RelationshipHasNoData cannot have data set on it", () => {
    const ecs = new Fiecs.World();

    const relationship = ecs.tag("some relationship");
    relationship.add(ecs.builtin.RelationshipHasNoData);

    const e = ecs.entity();
    const target = ecs.component(z.string());
    target.setName("some target");

    expect(() => e.set(relationship, target, "some data")).toThrow(
      '"(some relationship, some target)" has no data to be set',
    );
  });

  test("A relationship marked as RelationshipHasNoData cannot have data, so is not default initialized", () => {
    const ecs = new Fiecs.World();

    const relationship = ecs.tag("some relationship");
    relationship.add(ecs.builtin.RelationshipHasNoData);

    const e = ecs.entity();
    const target = ecs.component(z.string().default("default"));

    e.add(relationship, target);

    expect(e.get(relationship, target)).toBeUndefined();
  });

  test("A relationship marked as RelationshipHasNoData cannot have data & can thus target non-default initializable components", () => {
    const ecs = new Fiecs.World();

    const relationship = ecs.tag("some relationship");
    relationship.add(ecs.builtin.RelationshipHasNoData);

    const e = ecs.entity();
    const target = ecs.component(z.string());

    expect(() => e.add(relationship, target)).not.toThrow();
  });
});

describe("Trait trait", () => {
  test("Trait is a Trait", () => {
    const ecs = new Fiecs.World();
    expect(ecs.builtin.Trait.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A trait-relationship can not be added to a component that is already used (throws)", () => {
    const ecs = new Fiecs.World();
    const someComponent = ecs.tag();
    const someTarget = ecs.tag("some target");

    const someTrait = ecs.tag("some trait");
    someTrait.add(ecs.builtin.Trait);

    const e = ecs.entity("Peter Parker");
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
    const ecs = new Fiecs.World();
    const someComponent = ecs.tag();
    const someTarget = ecs.tag("some target");

    const someTrait = ecs.tag("some trait");
    someTrait.add(ecs.builtin.Trait);

    const e = ecs.entity("Peter Parker");
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
    const ecs = new Fiecs.World();

    expect(ecs.builtin.Acyclic.has(ecs.builtin.Trait)).toBe(true);
  });

  test("An acyclic relationship cannot target the entity it is added to", () => {
    const ecs = new Fiecs.World();
    const e = ecs.tag();

    const acyclicRelationship = ecs.tag("acyclicRelationship");
    acyclicRelationship.add(ecs.builtin.Acyclic);

    expect(() => {
      e.add(acyclicRelationship, e);
    }).toThrow(
      'Relationship "acyclicRelationship" is acyclic and cannot target the entity it is added to',
    );
  });

  test("An acyclic relationships cannot be added to a component that would create a direct cycle", () => {
    const ecs = new Fiecs.World();
    const e = ecs.tag();
    const target = ecs.tag();

    const acyclicRelationship = ecs.tag("acyclicRelationship");
    acyclicRelationship.add(ecs.builtin.Acyclic);

    e.add(acyclicRelationship, target);

    expect(() => {
      target.add(acyclicRelationship, e);
    }).toThrow(
      'Relationship "acyclicRelationship" is acyclic and cannot be added to an entity that would create a cycle',
    );
  });

  test("An acyclic relationship cannot be added to a component that would create an indirect cycle", () => {
    const ecs = new Fiecs.World();
    const power = ecs.tag();
    const responsibility = ecs.tag();
    const stress = ecs.tag();

    const acyclicRelationship = ecs.tag("acyclicRelationship");
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
    const ecs = new Fiecs.World();
    expect(ecs.builtin.Singleton.has(ecs.builtin.Trait)).toBe(true);
  });

  test("Singletons throw if trying to set on an entity", () => {
    const ecs = new Fiecs.World();

    const singletonComponent = ecs.component(z.string());
    singletonComponent.setName("singleton component");
    singletonComponent.add(ecs.builtin.Singleton);

    const e = ecs.entity();

    expect(() => {
      e.set(singletonComponent, "some value");
    }).toThrow(
      'Component "singleton component" is a singleton and cannot be added to entities other than itself',
    );
  });

  test("Singletons throw if trying to add to an entity", () => {
    const ecs = new Fiecs.World();

    const singletonComponent = ecs.component(z.string().default(""));
    singletonComponent.setName("singleton component");
    singletonComponent.add(ecs.builtin.Singleton);

    const e = ecs.entity();

    expect(() => {
      e.add(singletonComponent);
    }).toThrow(
      'Component "singleton component" is a singleton and cannot be added to entities other than itself',
    );
  });

  test("Singletons don't throw if trying to set on the component itself", () => {
    const ecs = new Fiecs.World();

    const singletonComponent = ecs.component(z.string());
    singletonComponent.setName("singleton component");
    singletonComponent.add(ecs.builtin.Singleton);

    expect(() => {
      singletonComponent.set(singletonComponent, "some value");
    }).not.toThrow();
  });

  test("When setting a component on the ecs world itself, it automatically becomes a singleton", () => {
    const ecs = new Fiecs.World();

    const singletonComponent = ecs.component(z.string());

    ecs.set(singletonComponent, "some value");

    expect(singletonComponent.has(ecs.builtin.Singleton)).toBe(true);
  });
});

describe("Symmetric trait", () => {
  test("Symmetric is a Trait", () => {
    const ecs = new Fiecs.World();
    expect(ecs.builtin.Symmetric.has(ecs.builtin.Trait)).toBe(true);
  });

  test("A relationship marked as Symmetric automatically creates the inverse relationship", () => {
    const ecs = new Fiecs.World();
    const friendOf = ecs.tag("friend of");
    friendOf.add(ecs.builtin.Symmetric);

    const alice = ecs.entity("Alice");
    const bob = ecs.entity("Bob");

    alice.add(friendOf, bob);

    expect(alice.has(friendOf, bob)).toBe(true);
    expect(bob.has(friendOf, alice)).toBe(true);
  });

  test("A relationship marked as Symmetric automatically removes the inverse relationship when removed", () => {
    const ecs = new Fiecs.World();
    const friendOf = ecs.tag("friend of");
    friendOf.add(ecs.builtin.Symmetric);
    const alice = ecs.entity("Alice");
    const bob = ecs.entity("Bob");
    alice.add(friendOf, bob);

    alice.remove(friendOf, bob);

    expect(alice.has(friendOf, bob)).toBe(false);
    expect(bob.has(friendOf, alice)).toBe(false);
  });

  test("When Symmetric is removed from a relationship, it no longer adds the inverse when added", () => {
    const ecs = new Fiecs.World();
    const friendOf = ecs.tag("friend of");
    friendOf.add(ecs.builtin.Symmetric);

    const alice = ecs.entity("Alice");
    const bob = ecs.entity("Bob");
    const clint = ecs.entity("Clint");

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
    const ecs = new Fiecs.World();
    expect(ecs.builtin.Target.has(ecs.builtin.Trait)).toBe(true);
  });

  test("An entity marked as Target can be used as target of a relationship", () => {
    const ecs = new Fiecs.World();

    const e = ecs.entity();
    const target = ecs.entity();
    target.add(ecs.builtin.Target);
    const r = ecs.tag();

    expect(() => {
      e.add(r, target);
    }).not.toThrow();
  });

  test("An entity marked as Target can NOT be used as a relationship", () => {
    const ecs = new Fiecs.World();

    const e = ecs.entity();
    const target = ecs.entity("marked target");
    target.add(ecs.builtin.Target);
    const r = ecs.tag();

    expect(() => {
      e.add(target, r);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a relationship',
    );
  });

  test("An entity marked as Target can NOT be used as component", () => {
    const ecs = new Fiecs.World();

    const e = ecs.entity();
    const target = ecs.entity("marked target");
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
    const ecs = new Fiecs.World();
    expect(
      ecs.builtin.TargetMustBeDefaultInitializable.has(ecs.builtin.Trait),
    ).toBe(true);
  });

  test("A relationship marked as TargetMustBeDefaultInitializable cannot be used with a component that cannot be default initialized", () => {
    const ecs = new Fiecs.World();
    const entity = ecs.entity();
    const nonDefaultInitializable = ecs.component(z.string());
    nonDefaultInitializable.setName("non default initializable");

    const r = ecs.tag("some relationship");
    r.add(ecs.builtin.RelationshipHasNoData);
    r.add(ecs.builtin.TargetMustBeDefaultInitializable);

    expect(() => entity.add(r, nonDefaultInitializable)).toThrow(
      'Relationship "some relationship" is marked as TargetMustBeDefaultInitializable while target "non default initializable" has data and is not default initializable',
    );
  });
});

describe("Exclusive Trait", () => {
  test("Exclusive is a Trait", () => {
    const ecs = new Fiecs.World();
    expect(ecs.builtin.Exclusive.has(ecs.builtin.Trait)).toBe(true);
  });

  test("If an exclusive relationship is added to an entity with a different target, the target is replaced, not added", () => {
    const ecs = new Fiecs.World();
    const isOnPlanet = ecs.tag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);

    const earth = ecs.entity("Earth");
    const mars = ecs.entity("Mars");

    const alice = ecs.entity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(isOnPlanet, mars);

    expect(alice.has(isOnPlanet, earth)).toBe(false);
    expect(alice.has(isOnPlanet, mars)).toBe(true);
  });

  test("on Exclusive replacement, data of former is also replaced", () => {
    const ecs = new Fiecs.World();
    const isOnPlanet = ecs.component(z.number().default(0));
    isOnPlanet.add(ecs.builtin.Exclusive);

    const earth = ecs.entity("Earth");
    const mars = ecs.entity("Mars");

    const alice = ecs.entity("Alice");

    alice.set(isOnPlanet, earth, 100);
    alice.set(isOnPlanet, mars, 200);

    expect(alice.get(isOnPlanet, earth)).toBeUndefined();
    expect(alice.get(isOnPlanet, mars)).toBe(200);
  });

  test("If an exclusive relationship which also has With's is replaced, the Withs are also replaced", () => {
    const ecs = new Fiecs.World();

    const isOnPlanet = ecs.tag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);

    const hasAtmosphere = ecs.tag("has atmosphere");
    isOnPlanet.add(ecs.builtin.With, hasAtmosphere);

    const likesCurrentPlanet = ecs.tag("likes current planet");
    isOnPlanet.add(ecs.builtin.With, likesCurrentPlanet);

    const earth = ecs.entity("Earth");
    const mars = ecs.entity("Mars");

    const alice = ecs.entity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(isOnPlanet, mars);

    expect(alice.has(hasAtmosphere, mars)).toBe(true);
    expect(alice.has(likesCurrentPlanet, mars)).toBe(true);
    expect(alice.has(hasAtmosphere, earth)).toBe(false);
    expect(alice.has(likesCurrentPlanet, earth)).toBe(false);
  });

  test("When an exclusive relationship is added, but the replacement cannot be added, there should not be a remove", () => {
    const ecs = new Fiecs.World();
    const isOnPlanet = ecs.tag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);
    isOnPlanet.add(ecs.builtin.TargetMustBeDefaultInitializable);

    const earth = ecs.entity("Earth");
    const mars = ecs.component(z.string());

    const alice = ecs.entity("Alice");

    alice.add(isOnPlanet, earth);

    expect(() => {
      alice.add(isOnPlanet, mars);
    }).toThrow();

    expect(alice.has(isOnPlanet, earth)).toBe(true);
    expect(alice.has(isOnPlanet, mars)).toBe(false);
  });

  test("Replacing an exclusive relationship happens with a single archetype move, and one archetype link being created, even under complex circumstances", () => {
    const ecs = new Fiecs.World();
    const isOnPlanet = ecs.tag("is on planet");
    isOnPlanet.add(ecs.builtin.Exclusive);

    const hasAtmosphere = ecs.tag("has atmosphere");
    isOnPlanet.add(ecs.builtin.With, hasAtmosphere);

    const likesCurrentPlanet = ecs.tag("likes current planet");
    isOnPlanet.add(ecs.builtin.With, likesCurrentPlanet);

    const someOtherTag = ecs.tag("some other tag");

    const earth = ecs.entity("Earth");
    const mars = ecs.entity("Mars");

    const alice = ecs.entity("Alice");

    alice.add(isOnPlanet, earth);
    alice.add(someOtherTag); // this matters, because this way the archetype for just removing (isOnPlanet, earth) doesn't exist

    ecs.startStatistics();
    alice.add(isOnPlanet, mars);

    expect(ecs.getStatistics().archetypesAdded).toBe(1);
    expect(ecs.getStatistics().linksAdded).toBe(1);
    expect(ecs.getStatistics().expensiveLookups).toBe(1);
  });

  // test("If an exclusive relationship which also has With's is replaced, the data of the Withs are also replaced", () => {});

  // test("If an exclusive relationship is also Symmetric, the replacement also replaces on the two symmetry targets", () => {

  // });

  //TODO[epic=atomic operations] Exclusive replacements should happen with a single archetype move, and establish a single archetype link, not multiple moves and links
  //TODO[epic=atomic operations] If an exclusive relationship is target of a With, adding it should work correctly
});

describe("Atomic operations", () => {
  test("When an add operation throws, it does not leave the ECS in a dirty state", () => {
    const ecs = new Fiecs.World();

    const e = ecs.entity();
    const target = ecs.entity("marked target");
    target.add(ecs.builtin.Target);
    const r = ecs.tag();

    expect(() => {
      e.add(target, r);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a relationship',
    );

    expect(ecs._debugBackendOperationIsDirty()).toBe(false);
  });

  test("When a nested operation fails inside an operation, no changes are made", () => {
    const ecs = new Fiecs.World();
    const relationshipComponent = ecs.tag("relationship component");
    relationshipComponent.add(ecs.builtin.Relationship);

    const tag = ecs.tag("tag");
    tag.add(ecs.builtin.With, relationshipComponent); // this will try to add relationshipComponent as a component, which should throw, but it should not add the With relationship

    const e = ecs.entity();

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
