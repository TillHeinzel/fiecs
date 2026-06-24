import { beforeEach } from "node:test";
import { describe, expect, test } from "vitest";
import z from "zod";

import { NoAccess, ReadOnly, ReadWrite, WriteOnly } from "../../API/Query";
import * as Fiecs from "../../index";

describe("Query filters only", () => {
  test("A filter-query that doesn't match any entities returns an iterator of length 0", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query(Fiecs.filter(tag));

    world.entity("not matched");
    expect(Array.from(query.getIteratorWithEntity()).length).toBe(0);
  });

  test("A single filter-query that matches entities returns all of them in the iterator", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query(Fiecs.filter(tag));

    world.entity("not matched");

    const e1 = world.entity().add(tag);
    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [] },
    ]);

    const e2 = world.entity().add(tag);
    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [] },
      { entity: e2, match: [] },
    ]);
  });

  describe("Different input types to create the filters work as singles", () => {
    const world = new Fiecs.World();

    const e = world.tag("e");
    const s = "e";

    const w = world.wildcard;

    const notMatched = world.entity("not matched");
    const matched = world.entity("matched").add(e).add([e, e]);

    beforeEach(() => {});

    const v = Fiecs.variable("v");

    test.for([
      ["e", e],
      ["s", s],
      ["*", w],
      ["v", v],
      ["$v", "$v"],
      ["p(e,e)", world.pair(e, e)],
      ["p(e,*)", world.pair(e, w)],
      ["p(*,e)", world.pair(w, e)],
      ["p(*,*)", world.pair(w, w)],
    ])("%s", ([, filter]) => {
      expect(
        Array.from(world.query(Fiecs.filter(filter)).getIteratorWithEntity()),
      ).toIncludeAllMembers([{ entity: matched, match: [] }]);
      expect(
        Array.from(
          world
            .query(Fiecs.filter([world.wildcard, world.wildcard]))
            .getIteratorWithEntity(),
        ),
      ).not.toIncludeAnyMembers([{ entity: notMatched, match: [] }]);
    });

    describe.for([
      ["e", e],
      ["*", w],
      ["s", s],
      ["v", v],
      ["$v", "$v"],
    ])("", ([firstname, first]) => {
      test.for([
        ["e", e],
        ["*", w],
        ["s", s],
        ["v", v],
        ["$v", "$v"],
      ])(`[${firstname as string}, %s]`, ([, second]) => {
        expect(
          Array.from(
            world.query(Fiecs.filter([first, second])).getIteratorWithEntity(),
          ),
        ).toIncludeAllMembers([{ entity: matched, match: [] }]);
        expect(
          Array.from(
            world
              .query(Fiecs.filter([world.wildcard, world.wildcard]))
              .getIteratorWithEntity(),
          ),
        ).not.toIncludeAnyMembers([{ entity: notMatched, match: [] }]);
      });
    });
  });

  test("Filter with string that cannot be found throws an error", () => {
    const world = new Fiecs.World();

    const tag = world.tag("tag");

    world.entity("not matched");
    world.entity().add(tag);

    const query = world.query(Fiecs.filter("nonExistent"));

    expect(() => query.each(() => {})).toThrow(
      `entity named "nonExistent" does not exist`,
    );
  });

  test("Filter with string that cannot be found throws an error (pair)", () => {
    const world = new Fiecs.World();

    world.tag("tag");

    const query = world.query(Fiecs.filter(["tag", "nonExistent"]));

    expect(() => query.each(() => {})).toThrow(
      `entity named "nonExistent" does not exist`,
    );
  });

  test("multiple filters", () => {
    const world = new Fiecs.World();

    const tag1 = world.tag();
    const tag2 = world.tag();

    const query = world.query(Fiecs.filter(tag1), Fiecs.filter(tag2));

    world.entity("not matched");
    world.entity("not matched2").add(tag1);
    world.entity("not matched3").add(tag2);

    const e1 = world.entity().add(tag1).add(tag2);
    const e2 = world.entity().add(tag1).add(tag2);
    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [] },
      { entity: e2, match: [] },
    ]);
  });

  // TODO: filter shouldn't match twice on the same entity
  // TODO: filter-only query shouldn't match any entities for match-only access (each, getIterator)

  // TODO: field should potentially match twice on the same entity

  // TODO: test filters with all the possible inputs
});

describe("Query fields", () => {
  test("single explicit field", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readWrite());

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("multiple explicit fields", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number());
    const comp2 = world.component(z.string());

    const query = world.query(
      Fiecs.field(comp1).readWrite(),
      Fiecs.field(comp2).readWrite(),
    );

    world.entity("not matched");
    const e1 = world.entity().set(comp1, 1701).set(comp2, "enterprise");
    const e2 = world.entity().set(comp1, 8472).set(comp2, "species");

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      {
        entity: e1,
        match: [new ReadWrite(comp1, e1), new ReadWrite(comp2, e1)],
      },
      {
        entity: e2,
        match: [new ReadWrite(comp1, e2), new ReadWrite(comp2, e2)],
      },
    ]);
  });

  test("implicit readWrite", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp));

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("readonly", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readOnly());

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadOnly(comp, e1)] },
      { entity: e2, match: [new ReadOnly(comp, e2)] },
    ]);
  });

  test("writeonly", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).writeOnly());

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new WriteOnly(comp, e1)] },
      { entity: e2, match: [new WriteOnly(comp, e2)] },
    ]);
  });
  test("noAccess", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).noAccess());

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new NoAccess(comp, e1)] },
      { entity: e2, match: [new NoAccess(comp, e2)] },
    ]);
  });

  test("explicit field with object that has no data will throw if trying to get/set data", () => {
    const world = new Fiecs.World();

    const tag = world.tag("tag");

    const query = world.query(Fiecs.field(tag));

    world.entity().add(tag);

    query.each((t) => {
      expect(() => t.get()).toThrow(
        'cannot get data for a component without data (component: "tag")',
      );
      expect(() => t.set(undefined)).toThrow(
        'cannot set data for a component without data (component: "tag")',
      );
    });
  });
});

describe("Query implicit fields and filters / defaults", () => {
  test("component is implicit read/write field", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(comp);

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [new ReadWrite(comp, e1)] },
      { entity: e2, match: [new ReadWrite(comp, e2)] },
    ]);
  });

  test("entity/tag is implicit filter", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query(tag);

    world.entity("not matched");
    const e1 = world.entity().add(tag);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [] },
    ]);
  });

  test("string is implicit filter", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query(tag);

    world.entity("not matched");
    const e1 = world.entity().add(tag);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [] },
    ]);
  });

  test("wildcard is implicit filter (which really doesn't constrain much)", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(world.wildcard);

    const notMatched = world.entity("not matched");
    const e1 = world.entity().set(comp, 1);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeAllMembers([
      { entity: e1, match: [] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toIncludeAllMembers([
      { entity: notMatched, match: [] },
    ]);
  });
});

describe("Query iteration function (each, and with entity + iterators)", () => {
  test("each iterates over all matches", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(comp);

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    const rets = new Array<ReadWrite<unknown>>();

    query.each((c) => {
      rets.push(c);
    });

    expect(rets).toIncludeSameMembers([
      new ReadWrite(comp, e1),
      new ReadWrite(comp, e2),
    ]);
  });

  test("each with entity iterates over all matches", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(comp);

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    const rets = new Array<[Fiecs.Entity, ReadWrite<unknown>]>();

    query.eachWithEntity((e, c) => {
      rets.push([e, c]);
    });

    expect(rets).toIncludeSameMembers([
      [e1, new ReadWrite(comp, e1)],
      [e2, new ReadWrite(comp, e2)],
    ]);
  });

  test("getIterator gets an iterator over only the matches", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(comp);

    world.entity("not matched");
    const e1 = world.entity().set(comp, 1701);
    const e2 = world.entity().set(comp, 8472);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadWrite(comp, e1)],
      [new ReadWrite(comp, e2)],
    ]);
  });

  test("getIteratorWithVariables", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query(Fiecs.filter(tag));

    world.entity("not matched");

    const e1 = world.entity("e1").add(tag);

    expect(Array.from(query.getIteratorWithVariables())).toIncludeSameMembers([
      { match: [], variables: new Map([["this", e1]]) },
    ]);

    const e2 = world.entity("e2").add(tag);

    expect(Array.from(query.getIteratorWithVariables())).toIncludeSameMembers([
      { match: [], variables: new Map([["this", e1]]) },
      { match: [], variables: new Map([["this", e2]]) },
    ]);
  });
});

describe("Query accessors function correctly", () => {
  test("getSource", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readWrite());

    const e = world.entity().set(comp, 1701);

    let val: Fiecs.Entity | undefined = undefined;

    query.each((c) => {
      val = c.getSource();
    });

    expect(val).toEqual(e);
  });

  test("getComponent & getPair for component", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readWrite());

    world.entity().set(comp, 1701);

    let val1: unknown = undefined;
    let val2: unknown = undefined;

    query.each((c) => {
      val1 = c.getComponent();
      val2 = c.getPair();
    });

    expect(val1).toEqual(comp);
    expect(val2).toEqual(undefined);
  });

  test("getComponent & getPair for pair", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());
    const tag = world.tag();
    const pair = world.pair(comp, tag);

    const query = world.query(Fiecs.field(pair).readWrite());

    world.entity().set(pair, 1701);

    let val1: unknown = undefined;
    let val2: unknown = undefined;

    query.each((c) => {
      val1 = c.getComponent();
      val2 = c.getPair();
    });

    expect(val1).toEqual(undefined);
    expect(val2).toEqual(pair);
  });

  test("Readwrite canGet", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readWrite());

    world.entity().set(comp, 1701);

    let val = false;

    query.each((c) => {
      val = c.hasGet();
    });

    expect(val).toBe(true);
  });

  test("Readwrite canGet", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readWrite());

    world.entity().set(comp, 1701);

    let val = false;

    query.each((c) => {
      val = c.hasSet();
    });

    expect(val).toBe(true);
  });

  test("Readwrite gets correctly", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readWrite());

    world.entity().set(comp, 1701);

    let val = 0;

    query.each((c) => {
      val = c.get()!;
    });

    expect(val).toBe(1701);
  });

  test("Readwrite set", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.field(comp).readWrite());

    const e = world.entity().set(comp, 1701);

    query.each((c) => {
      c.set(8472);
    });

    expect(e.get(comp)).toBe(8472);
  });
});

describe("Query iteration locks tables", () => {
  test("each locks tables during iteration", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean());

    const e1 = world.entity("e1").set(didMatch, false);

    const query = world.query(didMatch);

    query.each((c1) => {
      expect(world.areTablesLocked()).toBe(true);
      c1.set(true);
    });

    expect(e1.get(didMatch)).toBe(true);
  });

  test("tables are unlocked after finished each", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean());

    const e1 = world.entity("e1").set(didMatch, false);

    const query = world.query(didMatch);

    query.each((c1) => {
      c1.set(true);
    });

    expect(e1.get(didMatch)).toBe(true);
    expect(world.areTablesLocked()).toBe(false);
  });

  test("Tables are also unlocked if iteration exits unexpectedly due to e.g. an error being throw", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean());

    const e1 = world.entity("e1").set(didMatch, false);

    const query = world.query(didMatch);

    expect(() =>
      query.each((c1) => {
        c1.set(true);
        throw new Error("");
      }),
    ).toThrow("");

    expect(e1.get(didMatch)).toBe(true);
    expect(world.areTablesLocked()).toBe(false);
  });

  test("eachWithEntity locks tables during iteration", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean());

    const e1 = world.entity("e1").set(didMatch, false);

    const query = world.query(didMatch);

    query.eachWithEntity((e, c1) => {
      expect(world.areTablesLocked()).toBe(true);
      c1.set(true);
    });

    expect(e1.get(didMatch)).toBe(true);
  });

  test("tables are unlocked after finished eachWithEntity", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean());

    const e1 = world.entity("e1").set(didMatch, false);

    const query = world.query(didMatch);

    query.eachWithEntity((e, c1) => {
      c1.set(true);
    });

    expect(e1.get(didMatch)).toBe(true);
    expect(world.areTablesLocked()).toBe(false);
  });

  test("Tables are also unlocked if iteration exits unexpectedly due to e.g. an error being throw eachWithEntity", () => {
    const world = new Fiecs.World();

    const didMatch = world.component(z.boolean());

    const e1 = world.entity("e1").set(didMatch, false);

    const query = world.query(didMatch);

    expect(() =>
      query.eachWithEntity((e, c1) => {
        c1.set(true);
        throw new Error("");
      }),
    ).toThrow("");

    expect(e1.get(didMatch)).toBe(true);
    expect(world.areTablesLocked()).toBe(false);
  });
});
