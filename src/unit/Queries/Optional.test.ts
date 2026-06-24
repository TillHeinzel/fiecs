import { describe, expect, expectTypeOf, test } from "vitest";
import z from "zod";

import { AccessType, Query, ReadOnly, ReadWrite } from "#/API/Query";
import * as Fiecs from "#/index";
import {
  matchesStringArray,
  matchString,
  matchStringArray,
} from "#/Utility/matchStringArray";

describe("optional terms", () => {
  test("An optional term fully matches entities that do have the optional term, defaulting to readonly", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional(comp));

    const e1 = world.entity().add(tag).add(comp);
    const e2 = world.entity().add(tag).add(comp);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadOnly(comp, e1)] },
      { entity: e2, match: [new ReadOnly(comp, e2)] },
    ]);
  });

  test("An optional term also matches entities that do NOT have the optional term", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional(comp));

    const e1 = world.entity().add(tag);
    const e2 = world.entity().add(tag);

    expect(Array.from(query.getIteratorWithEntity())).toBeArrayOfSize(2);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadOnly(undefined, e1)] },
      { entity: e2, match: [new ReadOnly(undefined, e2)] },
    ]);
  });

  test("An optional term can have its source set", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag").add(comp);
    const tagNoComp = world.tag("tagNoComp");

    const query = world.query(
      [tag, "$cheese"],
      Fiecs.optional(comp).source("$cheese"),
    );

    world.entity("e1").add([tag, tag]);
    world.entity("e2").add([tag, tagNoComp]);

    expect(
      matchesStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      ["e1", ['ReadOnly("comp" from "tag")']],
      ["e2", ['ReadOnly("undefined" from "tagNoComp")']],
    ]);
  });

  test("An optional term will throw if the named source is not found at query runtime", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const tag = world.tag("tag");

    const query = world.query(
      tag,
      Fiecs.optional(comp).source("nonExistentEntity"),
    );

    world.entity().add(tag);

    expect(() => query.each(() => {})).toThrow(
      `entity named "nonExistentEntity" does not exist`,
    );
  });

  test("Two independent optional terms works", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const comp2 = world.component(z.string().default(""));
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional(comp), Fiecs.optional(comp2));

    const e1 = world.entity().add(tag).add(comp);
    const e2 = world.entity().add(tag).add(comp2);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new ReadOnly(comp, e1), new ReadOnly(undefined, e1)]]),
      matchString([e2, [new ReadOnly(undefined, e2), new ReadOnly(comp2, e2)]]),
    ]);
  });

  test(`A query with an optional term has the type T | undefined`, () => {
    const world = new Fiecs.World();

    world.tag("tag");
    const component = world.component(z.string());
    const component2 = world.component(z.number());

    const q = world.query(component, "tag", Fiecs.optional(component2));

    expectTypeOf(q).toExtend<
      Query<[ReadWrite<string>, ReadOnly<number | undefined>]>
    >();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.for(["ReadWrite", "ReadOnly", "WriteOnly", "NoAccess"] as Exclude<
    AccessType,
    "FilterOnly"
  >[])("An optional term can be set to %s", (s) => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional(comp).access(s));

    world.entity("e1").add(tag).add(comp);
    world.entity("e2").add(tag);

    expect(
      matchesStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      [`e1`, [`${s}("comp" from "e1")`]],
      [`e2`, [`${s}("undefined" from "e2")`]],
    ]);
  });

  test("An optional term can be set to DefaultAccess, giving ReadOnly", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(
      tag,
      Fiecs.optional(comp).access("DefaultAccess"),
    );

    world.entity("e1").add(tag).add(comp);
    world.entity("e2").add(tag);

    expect(
      matchesStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      [`e1`, [`ReadOnly("comp" from "e1")`]],
      [`e2`, [`ReadOnly("undefined" from "e2")`]],
    ]);
  });

  test("An optional term can NOT be set to FilterOnly, throwing an error", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");

    // @ts-expect-error this gives both a compiler and runtime error
    expect(() => Fiecs.optional(comp).access("FilterOnly")).toThrow(
      "optional terms cannot be filters",
    );
  });

  test("An optional term has the shorthand functions for access type", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(
      tag,
      Fiecs.optional(comp).defaultAccess(),
      Fiecs.optional(comp).readWrite(),
      Fiecs.optional(comp).readOnly(),
      Fiecs.optional(comp).writeOnly(),
      Fiecs.optional(comp).noAccess(),
    );

    world.entity("e1").add(tag).add(comp);

    expect(
      matchesStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      [
        `e1`,
        [
          `ReadOnly("comp" from "e1")`,
          `ReadWrite("comp" from "e1")`,
          `ReadOnly("comp" from "e1")`,
          `WriteOnly("comp" from "e1")`,
          `NoAccess("comp" from "e1")`,
        ],
      ],
    ]);
  });

  test("An optional term that can set on the accessor but did NOT match, will throw on set", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const didMatch = world
      .component(z.boolean().default(false))
      .setName("didMatch");

    const query = world.query(didMatch, Fiecs.optional(comp).readWrite());

    const e1 = world.entity("e1").set(didMatch, false);

    query.each((didMatch, c) => {
      didMatch.set(true);

      expect(() => c.set(3)).toThrow(
        "cannot use set on an optional term that did not match anything",
      );
    });

    expect(e1.get(didMatch)).toBe(true);
  });

  test("Optional terms can be set from an explicit field", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional(Fiecs.field(comp)));

    const e1 = world.entity().add(tag);
    const e2 = world.entity().add(tag).add(comp);

    expect(Array.from(query.getIteratorWithEntity())).toBeArrayOfSize(2);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadOnly(undefined, e1)] },
      { entity: e2, match: [new ReadOnly(comp, e2)] },
    ]);
  });

  test("Attempting to make an optional from a filter throws", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0));
    const tag = world.tag("tag");

    // @ts-expect-error test runtime and compile time
    expect(() => world.query(tag, Fiecs.optional(Fiecs.filter(comp)))).toThrow(
      "optional terms cannot be filters",
    );
  });

  test("optional(indexable) is cacheable", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean()).setName("didMatch");

    const opt = world.component(z.number().default(0)).setName("opt");

    expect(() =>
      world.forceCachedQuery(didMatch, Fiecs.optional(opt)),
    ).not.toThrow();

    const query = world.forceCachedQuery(didMatch, Fiecs.optional(opt));

    const matched = world.entity().set(didMatch, false);
    const matched2 = world.entity().set(didMatch, false).add(opt);

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
    expect(matched2.get(didMatch)).toBe(true);
  });

  describe("Trying to create a query, where a later basic term uses a variable set by an optional term throws", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    test("$this", () => {
      expect(() => world.query(Fiecs.optional(tag), tag)).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: this`,
      );
    });

    test("if this is set before optional, does not throw on this", () => {
      expect(() => world.query(tag, Fiecs.optional(tag), tag)).not.toThrow();
    });

    test("non-this source", () => {
      expect(() =>
        world.query(
          tag,
          Fiecs.optional([tag, tag]).source("$cheese"),
          "$cheese",
        ),
      ).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: cheese`,
      );
    });

    test("[x, var]", () => {
      expect(() =>
        world.query(tag, Fiecs.optional([tag, "$cheese"]), "$cheese"),
      ).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: cheese`,
      );
    });

    test("[var, x]", () => {
      expect(() =>
        world.query(tag, Fiecs.optional(["$cheese", tag]), "$cheese"),
      ).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: cheese`,
      );
    });

    test("[var, var]", () => {
      expect(() =>
        world.query(tag, Fiecs.optional(["$cheese", "$kaeso"]), [
          "$cheese",
          "$kaeso",
        ]),
      ).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: cheese, kaeso`,
      );
    });

    test("NotTerm consumer", () => {
      expect(() =>
        world.query(
          tag,
          Fiecs.optional(["$cheese", tag]),
          Fiecs.not("$cheese"),
        ),
      ).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: cheese`,
      );
    });

    test("OneOf consumer", () => {
      expect(() =>
        world.query(
          tag,
          Fiecs.optional(["$cheese", tag]),
          Fiecs.oneOf("$cheese"),
        ),
      ).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: cheese`,
      );
    });

    test("a dependent consumer does NOT throw", () => {
      expect(() =>
        world.query(
          tag,
          Fiecs.optional(["$cheese", tag]),
          Fiecs.dependent("$cheese"),
        ),
      ).not.toThrow();
    });
  });

  test("An optional term fully matches entities with pairs", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional([tag, comp]));

    const e1 = world.entity("e1").add(tag);
    const e2 = world.entity("e2").add(tag).add([tag, comp]);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new ReadOnly(undefined, e1)]]),
      matchString([e2, [new ReadOnly(world.pair(tag, comp), e2)]]),
    ]);
  });

  test("An optional term fully matches entities with pair wildcard", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional([tag, world.wildcard]));

    const e1 = world.entity("e1").add(tag);
    const e2 = world.entity("e2").add(tag).add([tag, comp]);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new ReadOnly(undefined, e1)]]),
      matchString([e2, [new ReadOnly(world.pair(tag, comp), e2)]]),
    ]);
  });

  test("An optional term fully matches entities with variable pair", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional([tag, "$cheese"]));

    const e1 = world.entity("e1").add(tag);
    const e2 = world.entity("e2").add(tag).add([tag, comp]);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new ReadOnly(undefined, e1)]]),
      matchString([e2, [new ReadOnly(world.pair(tag, comp), e2)]]),
    ]);
  });

  test("An optional term fully matches entities with variable pair with extra components", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");
    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional([tag, "$cheese"]));

    const e1 = world.entity("e1").add(tag).add(comp);
    const e2 = world.entity("e2").add(tag).add([tag, comp]);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new ReadOnly(undefined, e1)]]),
      matchString([e2, [new ReadOnly(world.pair(tag, comp), e2)]]),
    ]);
  });

  test("An optional term fully matches entities with variable pair with extra pair", () => {
    const world = new Fiecs.World();

    const tag = world.tag("tag");
    const tag2 = world.tag("tag2");

    const query = world.query(tag, Fiecs.optional([tag, "$cheese"]));

    const comp = world.component(z.number().default(0)).setName("comp");

    const e1 = world.entity("e1").add(tag).add([tag2, comp]);
    const e2 = world.entity("e2").add(tag).add([tag, comp]);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new ReadOnly(undefined, e1)]]),
      matchString([e2, [new ReadOnly(world.pair(tag, comp), e2)]]),
    ]);
  });

  test("An optional term fully matches entities with variable even if there is no candidates for the variable", () => {
    const world = new Fiecs.World();

    const tag = world.tag("tag");

    const query = world.query(tag, Fiecs.optional([tag, "$cheese"]));

    const e1 = world.entity("e1").add(tag);
    const e2 = world.entity("e2").add(tag);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new ReadOnly(undefined, e1)]]),
      matchString([e2, [new ReadOnly(undefined, e2)]]),
    ]);
  });

  test("An optional term can be used as the first term (although it shouldn't)", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number().default(0)).setName("comp");

    const query = world.query(Fiecs.optional(comp));

    const e1 = world.entity("e1").add(comp);
    const e2 = world.entity("e2");

    expect(matchStringArray(query.getIteratorWithEntity())).toIncludeAllMembers(
      [
        matchString([e1, [new ReadOnly(comp, e1)]]),
        matchString([e2, [new ReadOnly(undefined, e2)]]),
      ],
    );
  });
});

describe("dependent terms", () => {
  test("A dependent term that does not attempt to set any variables (including $this) matches like an optional term", () => {
    const world = new Fiecs.World();

    const tag = world.tag("tag");
    const comp = world.component(z.number().default(0)).setName("comp");

    const query = world.query(tag, Fiecs.dependent(comp));

    const e1 = world.entity("e1").add(tag);
    const e2 = world.entity("e2").add(tag).add(comp);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new Fiecs.ReadWrite(undefined, e1)]]),
      matchString([e2, [new Fiecs.ReadWrite(comp, e2)]]),
    ]);
  });

  describe("A term marked as dependent cannot set variables", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    test("this", () => {
      expect(() => world.query(Fiecs.dependent(tag))).toThrow(
        "A dependent term cannot set variables. Variables set: this",
      );
    });

    test("[var, x]", () => {
      expect(() => world.query(tag, Fiecs.dependent(["$cheese", tag]))).toThrow(
        "A dependent term cannot set variables. Variables set: cheese",
      );
    });
  });

  test("A dependent term that does not match anything does not constrain anything", () => {
    const world = new Fiecs.World();

    const tag = world.tag("tag");

    const query = world.query(
      tag,
      Fiecs.optional([tag, "$cheese"]),
      Fiecs.dependent("$cheese"),
    );

    const comp = world.component(z.number().default(0)).setName("comp");

    const e1 = world.entity("matchedNoOpt").add(tag);
    const e2 = world.entity("matchedOpt").add(tag).add([tag, comp]);
    const e3 = world
      .entity("matchedOptAndDependent")
      .add(tag)
      .add([tag, comp])
      .add(comp);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([
        e1,
        [new ReadOnly(undefined, e1), new ReadWrite(undefined, e1)],
      ]),
      matchString([
        e2,
        [new ReadOnly(world.pair(tag, comp), e2), new ReadWrite(undefined, e2)],
      ]),
      matchString([
        e3,
        [new ReadOnly(world.pair(tag, comp), e3), new ReadWrite(comp, e3)],
      ]),
    ]);
  });

  test.skip("A dependent term using a variable that ends up not being set, does not match, despite being able to match if it weren't dependent", () => {
    const world = new Fiecs.World();

    const tag = world.tag("tag");
    const tag2 = world.tag("tag2");

    const query = world.query(
      tag,
      Fiecs.optional([tag, "$cheese"]),
      // Fiecs.optional([tag2, "$cheese"]),
    );

    const comp = world.component(z.number().default(0)).setName("comp");

    const e = world.entity("matchedHasNoOpt").add(tag).add([tag2, comp]);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([
        e,
        [new ReadOnly(undefined, e), new ReadWrite(undefined, e)],
      ]),
    ]);
  });
});
