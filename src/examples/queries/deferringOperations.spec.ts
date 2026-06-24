import { describe, expect, test } from "vitest";
import z from "zod";

import * as Fiecs from "../../index";

describe.skip("Locked tables and deferring operations", () => {
  test(`Locked tables and deferring operations`, () => {
    const world = new Fiecs.World();

    const c = world.component(z.number());

    expect(c).toEqual(false);

    //     const world = new Fiecs.World();
    //     const position = world.component(z.number());
    //     const velocity = world.component(z.number().default(0));
    //     const query1 = world.query2(position);
    //     const e1 = world.entity().set(position, 0);
    //     // Attempting to add (or remove) a component from an entity in the currently
    //     // iterated table would move that entity between tables, which would get weird
    //     // so the tables get locked by the iteration functions, and this throws:
    //     expect(() => {
    //       query1.eachWithEntity((e, p) => {
    //         e.add(velocity);
    //       });
    //     }).toThrow();
    //     // and does not change the entities
    //     expect(e1.has(velocity)).toBe(false);
    //     // instead, we can defer the operations.
    //     world.beginDefer();
    //     query1.eachWithEntity((e, p) => {
    //       e.add(velocity);
    //     });
    //     expect(e1.has(velocity)).toBe(false);
    //     world.endDefer();
    //     expect(e1.has(velocity)).toBe(true);
    //     // alternatively:
    //     const isBlue = world.tag();
    //     world.defer(() => {
    //       query1.eachWithEntity((e, p) => {
    //         e.add(isBlue);
    //       });
    //     });
    //     expect(e1.has(isBlue)).toBe(true);
  });
});
