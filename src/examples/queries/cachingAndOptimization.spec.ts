import { describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../../index";

//SECTION - Query optimizations
// TODO[epic=query optimizations] - caching for query traversal -> rematching
// TODO[epic=query optimizations] - caching for variables
// TODO[epic=query optimizations] - empty archetype optimization
// TODO[epic=queries optimizations] - Change detection
//!SECTION

describe("Cached queries", () => {
  test("We can create  a cached query, which interacts just like a normal query", () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number());

    // this creates a cached query
    // where non-cached queries do basically nothing on creation, cached queries
    // build the cache on creation, so there is a little cost involved. They also
    // increase the cost of creating new archetypes, as every new archetype
    // needs to be checked by every cached query. Iteration can become a lot faster,
    // though, because in the maximally cached situation, no filtering needs to happen
    // iteration time.
    const query = world.cachedQuery(position, velocity);

    const entity1 = world.entity().set(position, 0).set(velocity, 3);

    // no filtering needs to happen in this case, as queries for components is fully cached.
    // The same goes for tags, pairs, and wildcards, as long as they use the default source ($this).
    query.each((position, velocity) => {
      position.set(position.get() + velocity.get());
    });

    expect(entity1.get(position)).toEqual(3);

    // this creates no new archetype, as archetype [position, velocity] already exists, so no overhead
    // from creating this entity.
    const entity2 = world.entity().set(position, 0).set(velocity, 4);

    const tag = world.tag();
    // this creates a new archetype [position, velocity, tag], which get signed up with the query
    const entity3 = world
      .entity()
      .set(position, 100)
      .set(velocity, -2)
      .add(tag);

    // again, no actual filtering happening at this point, just iterating the cached tables.
    query.each((position, velocity) => {
      position.set(position.get() + velocity.get());
    });

    expect(entity1.get(position)).toEqual(6);
    expect(entity2.get(position)).toEqual(4);
    expect(entity3.get(position)).toEqual(98);
  });

  test.skip("We can create forceCached queries that throw at creation, if some terms cannot be cached", () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number());

    const e = world.entity().set(position, 0).set(velocity, 1);

    // this works just like cachedQuery in this case, as queries for components
    // can be cached.
    expect(() => world.forceCachedQuery(position, velocity)).not.toThrow();
    // expect(() => world.forceCachedQuery(position, Fiecs.not(velocity))).not.toThrow();
    // expect(() => world.forceCachedQuery(Fiecs.oneOf(position, velocity))).not.toThrow();
    // expect(() => world.forceCachedQuery(position, Fiecs.optional(velocity))).not.toThrow();

    expect(() => world.forceCachedQuery("position")).toThrow(
      "cannot cache stringlookups",
    );
    expect(() =>
      world.forceCachedQuery(Fiecs.field(position).source(e)),
    ).toThrow("cannot cache non-$this sources");
    expect(() =>
      world.forceCachedQuery(Fiecs.field(position).source("$cheese")),
    ).toThrow("cannot cache non-$this sources");
    expect(() =>
      world.forceCachedQuery(Fiecs.field([position, "smthg"])),
    ).toThrow("cannot cache variables");
  });
});
