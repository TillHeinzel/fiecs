import { describe, expect, expectTypeOf, test } from "vitest";
import z from "zod";

import * as Fiecs from "#/index";
import { matchString, matchStringArray } from "#/Utility/matchStringArray";

describe("oneOf queries", () => {
  test("oneOf with no subterms throws", () => {
    // @ts-expect-error oneOf requires input checked at both compiletime and runtime
    expect(() => Fiecs.oneOf()).toThrow("oneOf needs at least one input");
  });

  test("oneOf with a single explicit field matches like its just that field", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number()).setName("comp");

    const query = world.query(Fiecs.oneOf(Fiecs.field(comp)));

    const e = world.entity("e").set(comp, 1);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e, match: [new Fiecs.ReadWrite(comp, e)] },
    ]);
  });

  test(`A query with an oneOf with a single field has the type of that field`, () => {
    const world = new Fiecs.World();
    const component = world.component(z.string());
    const q = world.query(Fiecs.oneOf(Fiecs.field(component)));
    expectTypeOf(q).toEqualTypeOf<
      Fiecs.QueryWithEntityAccess<[Fiecs.ReadWrite<string>]>
    >();
  });

  test("oneOf with a single explicit filter acts like its just that filter", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query(Fiecs.oneOf(Fiecs.filter(tag)));

    const e = world.entity("e").add(tag);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e, match: [] },
    ]);
  });

  test("oneOf with single term that has source other than this cannot access entity", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const e = world.entity("e").add(tag);

    const query = world.query(Fiecs.oneOf(Fiecs.filter(tag).source(e)));

    // @ts-expect-error throws and tested at compile time
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    expect(() => query.getIteratorWithEntity()).toThrow();
  });

  test("oneOf with 2 fields matches either of those fields", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");
    const comp2 = world.component(z.string()).setName("comp2");

    const query = world.query(
      Fiecs.oneOf(Fiecs.field(comp1), Fiecs.field(comp2)),
    );

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp2, "");

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new Fiecs.ReadWrite(comp1, e1)]]),
      matchString([e2, [new Fiecs.ReadWrite(comp2, e2)]]),
    ]);
  });

  test(`A query with a oneOf with 2 fields has the type of union between the types`, () => {
    const world = new Fiecs.World();
    const component1 = world.component(z.string());
    const component2 = world.component(z.number());
    const q = world.query(
      Fiecs.oneOf(Fiecs.field(component1), Fiecs.field(component2)),
    );
    expectTypeOf(q).toEqualTypeOf<
      Fiecs.QueryWithEntityAccess<[Fiecs.ReadWrite<string | number>]>
    >();
  });

  test("oneOf with implicit fields works", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");
    const comp2 = world.component(z.string()).setName("comp2");

    const query = world.query(Fiecs.oneOf(comp1, comp2));

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp2, "");

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([
      matchString([e1, [new Fiecs.ReadWrite(comp1, e1)]]),
      matchString([e2, [new Fiecs.ReadWrite(comp2, e2)]]),
    ]);
  });

  test(`A query with a oneOf with implicit fields has the type of union between the types`, () => {
    const world = new Fiecs.World();
    const component1 = world.component(z.string());
    const component2 = world.component(z.number());
    const q = world.query(Fiecs.oneOf(component1, component2));
    expectTypeOf(q).toEqualTypeOf<
      Fiecs.QueryWithEntityAccess<[Fiecs.ReadWrite<string | number>]>
    >();
  });

  test("oneOf with implicit filters works", () => {
    const world = new Fiecs.World();

    const comp1 = world.tag("comp1");
    const comp2 = world.tag("comp2");

    const query = world.query(Fiecs.oneOf(comp1, comp2));

    const e1 = world.entity("e1").add(comp1);
    const e2 = world.entity("e2").add(comp2);

    expect(
      matchStringArray(query.getIteratorWithEntity()),
    ).toIncludeSameMembers([matchString([e1, []]), matchString([e2, []])]);
  });

  test(`A query with a oneOf with implicit filters is purely filter`, () => {
    const world = new Fiecs.World();
    const component1 = world.tag();
    const component2 = world.tag();
    const q = world.query(Fiecs.oneOf(component1, component2));
    expectTypeOf(q).toEqualTypeOf<Fiecs.QueryWithEntityAccess<[]>>();
  });

  test("Trying to create a oneOf with subterms that mix filters and fields will throw", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const comp = world.component(z.number().default(0));

    expect(() => Fiecs.oneOf(tag, comp)).toThrow(
      "subterms of oneOf must all have the same access-type. Current: [FilterOnly, ReadWrite]",
    );
  });

  test("Trying to create a oneOf with subterms that mix different access-types will throw", () => {
    const world = new Fiecs.World();

    const c1 = world.component(z.string().default(""));
    const c2 = world.component(z.number().default(0));

    expect(() =>
      Fiecs.oneOf(Fiecs.field(c1).readOnly(), Fiecs.field(c2).readWrite()),
    ).toThrow(
      "subterms of oneOf must all have the same access-type. Current: [ReadOnly, ReadWrite]",
    );
  });

  test("If one of the oneofs has a non-this source, we cannot access the entity", () => {
    const world = new Fiecs.World();

    const c1 = world.component(z.string().default(""));
    const c2 = world.component(z.number().default(0));

    const e = world.entity().add(c2);

    const query = world.query(
      Fiecs.oneOf(Fiecs.readOnly(c1), Fiecs.field(c2).source(e)),
    );

    // @ts-expect-error checked at compiletime and runtime
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    expect(() => query.getIteratorWithEntity()).toThrow();
  });

  describe("Trying to create a query, where a later term uses a variable set by a oneOf term throws", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    test("", () => {
      expect(() => world.query(Fiecs.oneOf(tag), tag)).toThrow(
        `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: this`,
      );
    });
  });
});

// TODO - if a variable is set by a oneOf-subterm, any terms that come after that use it have to be dependent, because it is not a given that it will be set

// TODO - oneOf(not(t))
// TODO - not(oneOf(t))
// TODO - not(oneOf(t)) may leave variables unset
// TODO - optional(oneOf(t))
