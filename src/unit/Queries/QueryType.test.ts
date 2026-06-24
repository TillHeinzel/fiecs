import { describe, expectTypeOf, test } from "vitest";
import z from "zod";

import { Query } from "#/API/Query";

import { NoAccess, ReadOnly, ReadWrite, WriteOnly } from "../../API/Query";
import * as Fiecs from "../../index";

describe("Query return type based on inputs", () => {
  test(``, () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const q = world.query(Fiecs.filter(tag));

    expectTypeOf(q).toExtend<Query<[]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.number());

    const q = world.query(Fiecs.field(component));

    expectTypeOf(q).toExtend<Query<[ReadWrite<number>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component));

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).readWrite());

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).readWrite().source("$var"));

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).readOnly());

    expectTypeOf(q).toExtend<Query<[ReadOnly<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });
  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).readOnly().source("$var"));

    expectTypeOf(q).toExtend<Query<[ReadOnly<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).writeOnly());

    expectTypeOf(q).toExtend<Query<[WriteOnly<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });
  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).writeOnly().source("$var"));

    expectTypeOf(q).toExtend<Query<[WriteOnly<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).noAccess());

    expectTypeOf(q).toExtend<Query<[NoAccess<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).noAccess().source("$var"));

    expectTypeOf(q).toExtend<Query<[NoAccess<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).source("$var"));

    expectTypeOf(q).toExtend<Query<[ReadOnly<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());

    const q = world.query(Fiecs.field(component).source("$this"));

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());
    const component2 = world.component(z.number());

    const q = world.query(Fiecs.field(component), Fiecs.field(component2));

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>, ReadWrite<number>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const component = world.component(z.string());
    const component2 = world.component(z.number());

    const q = world.query(component, component2);

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>, ReadWrite<number>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const component = world.component(z.string());
    const component2 = world.component(z.number());

    const q = world.query(component, tag, component2);

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>, ReadWrite<number>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test(``, () => {
    const world = new Fiecs.World();

    world.tag("tag");
    const component = world.component(z.string());
    const component2 = world.component(z.number());

    const q = world.query(component, "tag", component2);

    expectTypeOf(q).toExtend<Query<[ReadWrite<string>, ReadWrite<number>]>>();
    expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.skip(``, () => {
    // const world = new Fiecs.World();
    // world.tag("tag");
    // const component = world.component(z.string());
    // const q = world.query(Fiecs.oneOf(component));
    // expectTypeOf(q).toExtend<Query<[ReadWrite<string>]>>();
    // expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.skip(``, () => {
    // const world = new Fiecs.World();
    // world.tag("tag");
    // const component = world.component(z.string());
    // const component2 = world.component(z.number());
    // const q = world.query(Fiecs.oneOf(component, component2));
    // expectTypeOf(q).toExtend<Query<[ReadWrite<string | number>]>>();
    // expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.skip(``, () => {
    // const world = new Fiecs.World();
    // const tag = world.tag("tag");
    // const q = world.query(Fiecs.oneOf(tag));
    // expectTypeOf(q).toExtend<Query<[]>>();
    // expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.skip(``, () => {
    // const world = new Fiecs.World();
    // const tag = world.tag("tag");
    // const component = world.component(z.string());
    // const q = world.query(Fiecs.oneOf(tag, component));
    // expectTypeOf(q).toExtend<Query<[]>>();
    // expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.skip(``, () => {
    // const world = new Fiecs.World();
    // world.tag("tag");
    // const component = world.component(z.string());
    // const q = world.query(Fiecs.oneOf("tag", component));
    // expectTypeOf(q).toExtend<Query<[]>>();
    // expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.skip(``, () => {
    // const world = new Fiecs.World();
    // world.tag("tag");
    // const component = world.component(z.string());
    // const q = world.query(Fiecs.oneOf(Fiecs.field("tag"), component));
    // expectTypeOf(q).toExtend<Query<[ReadWrite<unknown>]>>();
    // expectTypeOf(q).not.toExtend<Query<never>>();
  });

  test.skip(``, () => {
    // const world = new Fiecs.World();
    // world.tag("tag");
    // const component = world.component(z.string());
    // const q = world.query(Fiecs.oneOf(Fiecs.filter(component)));
    // expectTypeOf(q).toExtend<Query<[]>>();
    // expectTypeOf(q).not.toExtend<Query<never>>();
  });
});
