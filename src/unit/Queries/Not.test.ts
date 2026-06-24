import { describe, expect, test } from "vitest";
import z from "zod";

import { ReadOnly, ReadWrite } from "#/API/Query";
import * as Fiecs from "#/index";

describe("not queries", () => {
  test("not-filter works if there are no archetypes with the not-ed component", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const tag = world.tag();

    const query = world.query(comp, Fiecs.not(tag));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);
  });

  test("not-filter works if there are archetypes with the not-ed component", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number()).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(comp, Fiecs.not(tag));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(tag);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works with tag", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const exclude = world.tag();

    const query = world.query(comp, Fiecs.not(exclude));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works with component", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const exclude = world.component(z.string().default(""));

    const query = world.query(comp, Fiecs.not(exclude));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works with explicit filter", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const exclude = world.component(z.string().default(""));

    const query = world.query(comp, Fiecs.not(Fiecs.filter(exclude)));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works with string", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(comp, Fiecs.not("tag"));

    const exclude = world.tag("tag");

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works with stringPair", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const exclude = world.tag("exclude");

    const query = world.query(comp, Fiecs.not([exclude, "exclude"]));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add([exclude, exclude]);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works with variable", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query([comp, "$cheese"], Fiecs.not("$cheese"));

    const exclude = world.tag("tag");

    world.entity("not matched");
    const e1 = world.entity().set([comp, exclude], 1602);
    const e2 = world.entity().set([comp, exclude], 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(world.pair(comp, exclude), e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(world.pair(comp, exclude), e2)] },
    ]);
  });

  test.skip("not-filter with variable cannot set a variable", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    expect(() => world.query(comp, Fiecs.not("$somethingElse"))).toThrow(
      "Not-filter cannot set (non-source) variables",
    );

    // const query = world.query(comp, Fiecs.not("$somethingElse"));

    // const exclude = world.tag("tag");

    // world.entity("not matched");
    // world.entity().set(comp, 1602);
    // world.entity().set(comp, 1).add(exclude);

    // expect(() => query.each(() => {})).toThrow(
    //   "Not-filter cannot set variables",
    // );
  });

  test("not-filter works with variable that switches from archetype-based to entity-based", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(
      Fiecs.field(comp).source("$this"),
      Fiecs.not("$this"),
    );

    // const exclude = world.tag("tag");

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1);
    e2.add(e2);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works with variable-pair", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const exclude = world.tag("exclude");

    const query = world.query(
      [comp, "$cheese"],
      Fiecs.not([exclude, "$cheese"]),
    );

    const tag = world.tag("tag");

    world.entity("not matched");
    const e1 = world.entity().set([comp, tag], 1602);
    const e2 = world.entity().set([comp, tag], 1).add([exclude, tag]);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(world.pair(comp, tag), e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(world.pair(comp, tag), e2)] },
    ]);
  });

  test("not-filter does not work with nested not", () => {
    const world = new Fiecs.World();

    const exclude = world.tag("tag");

    // @ts-expect-error gives error at both compile time and runtime
    expect(() => Fiecs.not(Fiecs.not(exclude))).toThrow("bad input for not(t)");
  });

  test("not-filter can have explicit source set to this without change", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const exclude = world.tag();

    const query = world.query(comp, Fiecs.not(exclude).source("$this"));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter can have explicit source set to other without change", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const exclude = world.tag();

    const query = world.query(
      Fiecs.field(comp).source("$other"),
      Fiecs.not(exclude).source("$other"),
    );

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadOnly(comp, e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadOnly(comp, e2)],
    ]);
  });

  test("not-filter can have explicit source set to entity", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const exclude = world.tag();

    const query = world.query(
      Fiecs.field([comp, "$cheese"]),
      Fiecs.not(exclude).source("$cheese"),
    );

    const excluded = world.tag("excluded").add(exclude);
    const notExcluded = world.tag("notExcluded");

    world.entity("not matched");
    const e1 = world.entity().add([comp, notExcluded]);
    const e2 = world.entity().add([comp, excluded]);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(world.pair(comp, notExcluded), e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      {
        entity: e2,
        match: [new ReadWrite(world.pair(comp, excluded), e2)],
      },
    ]);
  });

  test("if the string-source of a not-filter does not exist at query runtime, an error is thrown", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const exclude = world.tag();

    const query = world.query(
      Fiecs.field(comp),
      Fiecs.not(exclude).source("kaeso"),
    );

    world.entity("not matched");
    world.entity().add(comp);
    world.entity().add(comp).add(exclude);

    expect(() => query.each(() => {})).toThrow(
      `entity named "kaeso" does not exist`,
    );
  });

  test("not-filter works as first term (filter)", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const exclude = world.tag("tag");

    const query = world.query(Fiecs.not(exclude), comp);

    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("not-filter works as first term (field)", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const exclude = world.component(z.string().default(""));

    const query = world.query(Fiecs.not(exclude), comp);

    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("queries can access entity if not-filter is the only filter working on this-source", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const exclude = world.tag("tag");

    const query = world.query(Fiecs.not(exclude));

    const e1 = world.entity().set(comp, 1602);
    const e2 = world.entity().set(comp, 1).add(exclude);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeAllMembers([
      { entity: e1, match: [] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAnyMembers([
      { entity: e2, match: [] },
    ]);
  });

  test("queries can NOT access entity if all filters (including a not) work on source other", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const exclude = world.tag("tag");

    const e1 = world.entity().set(comp, 1602);

    const query = world.query(Fiecs.not(exclude).source(e1));

    // @ts-expect-error does not exist
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    expect(() => query.getIteratorWithEntity()).toThrow();
  });

  test("not(indexable) is cacheable", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean()).setName("didMatch");

    const exclude = world.tag("exclude");

    expect(() =>
      world.forceCachedQuery(didMatch, Fiecs.not(exclude)),
    ).not.toThrow();

    const query = world.forceCachedQuery(didMatch, Fiecs.not(exclude));

    const matched = world.entity().set(didMatch, false);
    const notMatched = world.entity().set(didMatch, false).add(exclude);

    let uncachedMatchAttempts = 0;

    query._trackedEach(
      (didMatch) => {
        didMatch.set(true);
      },
      () => {
        ++uncachedMatchAttempts;
      },
    );

    expect(uncachedMatchAttempts).toBe(0);
    // expect(false).toBe(true);
    expect(matched.get(didMatch)).toBe(true);
    expect(notMatched.get(didMatch)).toBe(false);
  });
});
