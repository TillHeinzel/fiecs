import { describe, expect, expectTypeOf, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "./index";

describe("Query", () => {
  test("We can query to get all entities with a specific tag", () => {
    const world = new Fiecs.World();
    const cheese = world.tag("cheese");
    const wine = world.tag("wine");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(cheese);
    bob.add(wine);
    clint.add(cheese);

    const cheeseQuery = world.query(cheese);

    expect(Array.from(cheeseQuery.matches())).toIncludeSamePartialMembers([
      { entity: alice },
      { entity: clint },
    ]);
  });

  test("We can query to get all entities with a specific component", () => {
    const world = new Fiecs.World();
    const cheese = world.component(z.string().default("cheese"));
    const wine = world.component(z.string().default("wine"));

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(cheese);
    bob.add(wine);
    clint.add(cheese).add(wine);

    const cheeseQuery = world.query(cheese);

    expect(Array.from(cheeseQuery.matches())).toIncludeSamePartialMembers([
      { entity: alice },
      { entity: clint },
    ]);
  });

  test("We can query to get all entities with a specific component", () => {
    const world = new Fiecs.World();
    const cheese = world.component(z.string().default("cheese"));
    const wine = world.component(z.string().default("wine"));

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(cheese);
    bob.add(wine);
    clint.add(cheese).add(wine);

    const cheeseQuery = world.query(cheese);

    expect(Array.from(cheeseQuery.matches())).toIncludeSamePartialMembers([
      { entity: alice },
      { entity: clint },
    ]);
  });

  test("We can query to get all entities with a specific set of components", () => {
    const world = new Fiecs.World();
    const cheese = world.component(z.string().default("cheese"));
    const wine = world.component(z.string().default("wine"));

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(cheese);
    bob.add(wine);
    clint.add(cheese).add(wine);

    const cheeseQuery = world.query(Fiecs.and(cheese, wine));

    expect(Array.from(cheeseQuery.matches())).toIncludeSamePartialMembers([
      { entity: clint },
    ]);
  });

  test("We can query to get all entities with one of a specific set of components", () => {
    const world = new Fiecs.World();
    const cheese = world
      .component(z.string().default("cheese"))
      .setName("cheese");
    const wine = world.component(z.string().default("wine")).setName("wine");
    const bread = world.tag("bread");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(cheese);
    bob.add(wine);
    clint.add(bread);

    const cheeseQuery = world.query(Fiecs.or(cheese, wine));

    expect(Array.from(cheeseQuery.matches())).toIncludeSamePartialMembers([
      { entity: alice },
      { entity: bob },
    ]);
  });

  test("or matches the same entity multiple times, if it must", () => {
    const world = new Fiecs.World();
    const cheese = world
      .component(z.string().default("cheese"))
      .setName("cheese");
    const wine = world.component(z.string().default("wine")).setName("wine");
    // const bread = world.tag("bread");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(cheese);
    bob.add(wine);
    clint.add(cheese).add(wine);

    const cheeseQuery = world.query(Fiecs.or(cheese, wine));

    expect(Array.from(cheeseQuery.matches())).toIncludeSamePartialMembers([
      { entity: alice },
      { entity: bob },
      { entity: clint },
      { entity: clint },
    ]);
  });

  describe("We can query to get all entities with a combination of and and or", () => {
    test("", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(bread).add(wine);
      clint.add(cheese).add(wine);

      const cheeseQuery = world.query(Fiecs.and(bread, Fiecs.or(cheese, wine)));

      expect(Array.from(cheeseQuery.matches())).toIncludeSamePartialMembers([
        { entity: alice },
        { entity: bob },
      ]);
    });

    test("", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(cheese).add(wine);

      const query = world.query(Fiecs.or(bread, Fiecs.and(cheese, wine)));

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice },
        { entity: clint },
      ]);
    });

    test("", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      // bob;
      clint.add(cheese).add(wine);

      const query = world.query(Fiecs.or(bread, Fiecs.or(cheese, wine)));

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice },
        { entity: alice },
        { entity: clint },
        { entity: clint },
      ]);
    });

    test("and and", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese).add(wine);
      bob.add(bread);
      clint.add(cheese).add(wine);

      const query = world.query(Fiecs.and(bread, Fiecs.and(cheese, wine)));

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice },
      ]);
    });
  });

  describe("matches on a query contain the components that caused the match, in correct order: ", () => {
    test("tag", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(bread).add(cheese).add(wine);

      const query = world.query(bread);

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice, match: [bread] },
        { entity: clint, match: [bread] },
      ]);
    });

    test("component", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(bread).add(cheese).add(wine);

      const query = world.query(cheese);

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice, match: [cheese] },
        { entity: clint, match: [cheese] },
      ]);
    });

    test("and", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(bread).add(cheese).add(wine);

      const query = world.query(Fiecs.and(bread, cheese));

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice, match: [bread, cheese] },
        { entity: clint, match: [bread, cheese] },
      ]);
    });

    test("or", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(bread).add(cheese).add(wine);

      const query = world.query(Fiecs.or(bread, cheese));

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice, match: [bread] },
        { entity: clint, match: [bread] },
        { entity: alice, match: [cheese] },
        { entity: clint, match: [cheese] },
      ]);
    });

    test("and or", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(bread).add(cheese).add(wine);

      const query = world.query(Fiecs.and(bread, Fiecs.or(cheese, wine)));

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice, match: [bread, cheese] },
        { entity: clint, match: [bread, cheese] },
        { entity: clint, match: [bread, wine] },
      ]);
    });

    test("and and", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(bread).add(cheese).add(wine);

      const query = world.query(Fiecs.and(bread, Fiecs.and(cheese, wine)));

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: clint, match: [bread, cheese, wine] },
      ]);
    });

    test("or and", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");
      const bob = world.entity("Bob");
      const clint = world.entity("Clint");

      alice.add(bread).add(cheese);
      bob.add(wine);
      clint.add(bread).add(cheese).add(wine);

      const query = world.query(
        Fiecs.or(Fiecs.and(bread, cheese), Fiecs.and(cheese, wine)),
      );

      expect(Array.from(query.matches())).toIncludeSamePartialMembers([
        { entity: alice, match: [bread, cheese] },
        { entity: clint, match: [bread, cheese] },
        { entity: clint, match: [cheese, wine] },
      ]);
    });
  });

  describe("match on queries contains type information on the component: ", () => {
    test("Tag", () => {
      const world = new Fiecs.World();
      // const cheese = world
      //   .component(z.string().default("cheese"))
      //   .setName("cheese");
      // const wine = world.component(z.string().default("wine")).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(bread);

      const query = world.query(bread);

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<[typeof bread]>();
      expect(match).toIncludeSameMembers([bread]);
    });

    test("Component", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      // const wine = world.component(z.string().default("wine")).setName("wine");
      // const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(cheese);

      const query = world.query(cheese);

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<[typeof cheese]>();
      expect(match).toIncludeSameMembers([cheese]);

      expectTypeOf(alice.get(match[0])).toEqualTypeOf<string | undefined>();
    });

    test("And", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      // const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(cheese).add(wine);

      const query = world.query(Fiecs.and(cheese, wine));

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<[typeof cheese, typeof wine]>();
      expect(match).toIncludeSameMembers([cheese, wine]);

      expectTypeOf(alice.get(match[0])).toEqualTypeOf<string | undefined>();
      expectTypeOf(alice.get(match[1])).toEqualTypeOf<number | undefined>();
    });

    test("Or", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      // const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(cheese);

      const query = world.query(Fiecs.or(cheese, wine));

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<[typeof cheese] | [typeof wine]>();
      expect(match).toIncludeSameMembers([cheese]);

      expectTypeOf(alice.get(match[0])).toEqualTypeOf<
        string | number | undefined
      >();
    });

    test("Or Or", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(cheese);

      const query = world.query(Fiecs.or(bread, Fiecs.or(cheese, wine)));

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<
        [typeof bread] | [typeof cheese] | [typeof wine]
      >();
      expect(match).toEqual([cheese]);
    });

    test("And Or", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(cheese).add(bread);

      const query = world.query(Fiecs.and(bread, Fiecs.or(cheese, wine)));

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<
        [typeof bread, typeof cheese] | [typeof bread, typeof wine]
      >();
      expect(match).toEqual([bread, cheese]);

      expectTypeOf(alice.get(match[1])).toEqualTypeOf<
        string | number | undefined
      >();
    });

    test("Or And And", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(cheese).add(bread);

      const query = world.query(
        Fiecs.or(Fiecs.and(bread, cheese), Fiecs.and(bread, wine)),
      );

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<
        [typeof bread, typeof cheese] | [typeof bread, typeof wine]
      >();
      expect(match).toEqual([bread, cheese]);

      expectTypeOf(alice.get(match[1])).toEqualTypeOf<
        string | number | undefined
      >();
    });

    test("Or And", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(cheese).add(wine);

      const query = world.query(Fiecs.or(bread, Fiecs.and(cheese, wine)));

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<
        [typeof bread] | [typeof cheese, typeof wine]
      >();
      expect(match).toEqual([cheese, wine]);
    });

    test("And And", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      const bread = world.tag("bread");

      const alice = world.entity("Alice");

      alice.add(bread).add(cheese).add(wine);

      const query = world.query(Fiecs.and(bread, Fiecs.and(cheese, wine)));

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<
        [typeof bread, typeof cheese, typeof wine]
      >();
      expect(match).toEqual([bread, cheese, wine]);
    });

    test("Or And Or", () => {
      const world = new Fiecs.World();
      const cheese = world
        .component(z.string().default("cheese"))
        .setName("cheese");
      const wine = world.component(z.number().default(10)).setName("wine");
      const bread = world.tag("bread");
      const beer = world.component(z.boolean().default(true)).setName("beer");

      const alice = world.entity("Alice");

      alice.add(cheese).add(beer);

      const query = world.query(
        Fiecs.or(bread, Fiecs.and(cheese, Fiecs.or(beer, wine))),
      );

      const match = query.matches().next().value!.match;

      expectTypeOf(match).toEqualTypeOf<
        | [typeof bread]
        | [typeof cheese, typeof beer]
        | [typeof cheese, typeof wine]
      >();
      expect(match).toEqual([cheese, beer]);
    });
  });

  test("We can query with pairTag", () => {
    const world = new Fiecs.World();
    const likes = world.entity("likes");
    const cheese = world
      .component(z.string().default("cheese"))
      .setName("cheese");
    const wine = world.component(z.string().default("wine")).setName("wine");
    const bread = world.tag("bread");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes, cheese);
    bob.add(likes, bread);
    clint.add(likes, wine).add(likes, bread);

    const likesBread = world.pair(likes, bread);

    const query = world.query(likesBread);

    expect(Array.from(query.matches())).toIncludeAllPartialMembers([
      { entity: bob, match: [likesBread] },
      { entity: clint, match: [likesBread] },
    ]);

    const match = query.matches().next().value!.match;

    expectTypeOf(match).toEqualTypeOf<[typeof likesBread]>();
  });

  test("We can query with pairComponent", () => {
    const world = new Fiecs.World();
    const likes = world.entity("likes");
    const cheese = world
      .component(z.string().default("cheese"))
      .setName("cheese");
    const wine = world.component(z.string().default("wine")).setName("wine");
    const bread = world.tag("bread");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(likes, cheese);
    bob.add(likes, wine);
    clint.add(likes, wine).add(likes, bread);

    const likesWine = world.pair(likes, wine);

    const query = world.query(likesWine);

    expect(Array.from(query.matches())).toIncludeAllPartialMembers([
      { entity: bob, match: [likesWine] },
      { entity: clint, match: [likesWine] },
    ]);

    const match = query.matches().next().value!.match;

    expectTypeOf(match).toEqualTypeOf<[typeof likesWine]>();
  });

  test("We can query with wildcard", () => {
    const world = new Fiecs.World();
    const cheese = world
      .component(z.string().default("cheese"))
      .setName("cheese");
    const wine = world.component(z.string().default("wine")).setName("wine");
    // const bread = world.tag("bread");

    const alice = world.entity("Alice");
    const bob = world.entity("Bob");
    const clint = world.entity("Clint");

    alice.add(cheese);
    bob.add(wine);
    clint.add(cheese).add(wine);

    const query = world.query(world.wildcard);

    expect(Array.from(query.matches())).toIncludeAllPartialMembers([
      { entity: alice, match: [cheese] },
      { entity: bob, match: [wine] },
      { entity: clint, match: [cheese] },
      { entity: clint, match: [wine] },
    ]);

    const match = query.matches().next().value!.match;

    expectTypeOf(match).toEqualTypeOf<[unknown]>();
  });

  //TODO[epic=queries] - Wildcard Queries https://www.flecs.dev/flecs/md_docs_2Queries.html#wildcards
  //TODO[epic=queries] - Any-wildcard Queries https://www.flecs.dev/flecs/md_docs_2Queries.html#wildcards
  //TODO[epic=queries] - Defer add and remove operations during query execution, or throw
  //TODO[epic=queries] - Cached Queries
  //TODO[epic=queries] - Not operator
  //TODO[epic=queries] - Optional operator
  //TODO[epic=queries] - .each((...)=>{...}) https://github.com/SanderMertens/flecs/blob/master/examples/cpp/queries/each_callback/src/main.cpp
  //TODO[epic=queries] - ignore empty tables for cached queries https://www.flecs.dev/flecs/md_docs_2Queries.html#performance-and-caching

  //TODO[epic=Inheritance] - Component Inheritance Queries

  //TODO[epic=advanced queries] - querying by component-name (gives any, I guess) https://www.flecs.dev/flecs/md_docs_2Queries.html#components-2
  //TODO[epic=advanced queries] - Fancy additional operators (Equality operators, AndFrom, OrFrom, NotFrom, )
  //TODO[epic=advanced queries] - Access modifiers
  //TODO[epic=advanced queries] - Source modifiers
  //TODO[epic=advanced queries] - Relationship traversal
  //TODO[epic=advanced queries] - Variables
  //TODO[epic=advanced queries] - Member value queries
  //TODO[epic=advanced queries] - Change detection
  //TODO[epic=advanced queries] - Sorting
  //TODO[epic=advanced queries] - Grouping
});
