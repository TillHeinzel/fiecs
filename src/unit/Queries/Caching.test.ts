import { describe, expect, test } from "vitest";
import z from "zod";

import { ReadWrite } from "#/API/Query";
import * as Fiecs from "#/index";

describe("Query caching", () => {
  test("We can track a normal queries' internals (for debugging and testing)", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(comp);

    world.entity("not matched");
    world.entity().set(comp, 1701);
    world.entity().set(comp, 8472);

    let successfulMatches = 0;
    let missingVarsCount = 0;
    let otherOutcomes = 0;

    query._trackedEach(
      () => {},
      (o) => {
        if (o.result === "successfulField") ++successfulMatches;
        else if (o.result === "missingSourceVariable") ++missingVarsCount;
        else ++otherOutcomes;
      },
    );

    expect(successfulMatches).toBe(1); // the archetype [comp]
    expect(missingVarsCount).toBe(1); // to get $this
    expect(otherOutcomes).toBe(0);
  });

  test(`a force cached query for a single indexable term will not 
      attempt any matches (should all be cached)`, () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    world.entity("not matched");
    world.entity().set(comp, 1701);
    world.entity().set(comp, 8472);

    const query = world.forceCachedQuery(comp);

    let matchAttempts = 0;

    query._trackedEach(
      () => {},
      () => {
        ++matchAttempts;
      },
    );

    expect(matchAttempts).toBe(0);
  });

  describe("a force cached query with a term that is not cacheable will throw", () => {
    test("index with fixed source", () => {
      const world = new Fiecs.World();
      const comp = world.component(z.string());
      const e = world.entity();

      expect(() => world.forceCachedQuery(Fiecs.field(comp).source(e))).toThrow(
        "cannot cache",
      );
    });

    test("index with string source", () => {
      const world = new Fiecs.World();
      const comp = world.component(z.string());

      expect(() =>
        world.forceCachedQuery(Fiecs.field(comp).source("cheese")),
      ).toThrow("cannot cache");
    });

    test("index with non-this variable source", () => {
      const world = new Fiecs.World();
      const comp = world.component(z.string());

      expect(() =>
        world.forceCachedQuery(Fiecs.field(comp).source("$cheese")),
      ).toThrow("cannot cache");
    });

    test("string lookup", () => {
      const world = new Fiecs.World();
      expect(() => world.forceCachedQuery("bla")).toThrow("cannot cache");
    });

    test("string lookup pair", () => {
      const world = new Fiecs.World();
      expect(() => world.forceCachedQuery([world.tag(), "bla"])).toThrow(
        "cannot cache",
      );
    });

    test("variable string", () => {
      const world = new Fiecs.World();
      expect(() => world.forceCachedQuery("$cheese")).toThrow("cannot cache");
    });

    test("variable", () => {
      const world = new Fiecs.World();
      expect(() => world.forceCachedQuery(Fiecs.variable("cheese"))).toThrow(
        "cannot cache",
      );
    });

    test("variable pair", () => {
      const world = new Fiecs.World();
      expect(() =>
        world.forceCachedQuery([world.tag(), Fiecs.variable("cheese")]),
      ).toThrow("cannot cache");
    });

    test("not(not cacheable)", () => {
      const world = new Fiecs.World();
      expect(() =>
        world.forceCachedQuery(Fiecs.not(Fiecs.variable("cheese"))),
      ).toThrow("cannot cache");
    });

    test("first term cacheable, second not", () => {
      const world = new Fiecs.World();
      expect(() =>
        world.forceCachedQuery(world.tag(), [
          world.tag(),
          Fiecs.variable("cheese"),
        ]),
      ).toThrow("cannot cache");
    });

    test("2 terms cacheable, third not", () => {
      const world = new Fiecs.World();
      expect(() =>
        world.forceCachedQuery(world.tag(), [
          world.tag(),
          Fiecs.variable("cheese"),
        ]),
      ).toThrow("cannot cache");
    });
  });

  test("a force cached query for a single component will give the correct result for archetypes existing at query creation", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    const query = world.cachedQuery(comp);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("a force cached query for a multiple components will give the correct result for archetypes existing at query creation", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const comp2 = world.component(z.string());

    world.entity("not matched");
    world.entity("not matched2").set(comp2, "");
    world.entity("not matched3").set(comp, 0);
    const e1 = world.entity().set(comp, 1701).set(comp2, "");
    const e2 = world.entity().set(comp, 8472).set(comp2, "");

    const query = world.cachedQuery(comp, comp2);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      {
        entity: e1,
        match: [new ReadWrite(comp, e1), new ReadWrite(comp2, e1)],
      },
      {
        entity: e2,
        match: [new ReadWrite(comp, e2), new ReadWrite(comp2, e2)],
      },
    ]);
  });

  test("A (non-forced) cached query with a single cacheable term will not attempt any matches", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    world.entity("not matched");
    world.entity().set(comp, 1701);
    world.entity().set(comp, 8472);

    const query = world.cachedQuery(comp);

    let matchAttempts = 0;

    query._trackedEach(
      () => {},
      () => {
        ++matchAttempts;
      },
    );

    expect(matchAttempts).toBe(0);
  });

  test("A (non-forced) cached query with a non-cacheable term WILL attempt matches", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    world.entity("not matched");
    const e = world.entity().set(comp, 1701);
    world.entity().set(comp, 8472);

    const query = world.cachedQuery(Fiecs.field(comp).source(e));

    let matchAttempts = 0;

    query._trackedEach(
      () => {},
      () => {
        ++matchAttempts;
      },
    );

    expect(matchAttempts).toBe(1);
  });

  test("A (non-forced) cached query with a non-cacheable second term will attempt matches for the later term", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const comp = world.component(z.number());
    const pair = world.pair(tag, comp);

    world.entity("not matched");
    const e = world.entity().set(pair, 1701).add(tag);

    const query = world.cachedQuery(tag, Fiecs.field(pair).source(e));

    const matches: [
      typeof e.data | string,
      (typeof comp.data | typeof pair.data | undefined)[],
    ][] = [];

    query._trackedEach(
      () => {},
      (o) => {
        if (o.result === "successfulField")
          matches.push([o.source, Array.from(o.matches)]);
      },
    );

    expect(matches).toIncludeSameMembers([[e.data, [pair.data]]]);
  });

  test("A (non-forced) cached query with a non-cacheable third term will attempt matches for the later term", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const comp = world.component(z.number());
    const pair = world.pair(tag, comp);

    world.entity("not matched");
    const e = world.entity().set(comp, 1).set(pair, 1701).add(tag);

    const query = world.cachedQuery(tag, comp, Fiecs.field(pair).source(e));

    const matches: [
      typeof e.data | string,
      (typeof comp.data | typeof pair.data | undefined)[],
    ][] = [];

    query._trackedEach(
      () => {},
      (o) => {
        if (o.result === "successfulField")
          matches.push([o.source, Array.from(o.matches)]);
      },
    );

    expect(matches).toIncludeSameMembers([[e.data, [pair.data]]]);
  });

  test("A cached query will update with new archetypes as they are added", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const query = world.cachedQuery(comp);

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    const tag = world.tag();
    const e2 = world.entity().set(comp, 2).add(tag);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });
});
