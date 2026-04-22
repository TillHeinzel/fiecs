import { expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../../index";

test.skip("childof hierarchy", () => {
  const world = new Fiecs.World();

  const position = world
    .component(z.object({ x: z.number(), y: z.number() }))
    .setName("position");

  const star = world.tag("Star");
  const planet = world.tag("Planet");
  const moon = world.tag("Moon");

  // Create a simple hierarchy.
  // Hierarchies use ECS relationships and the builtin ChildOf relationship to
  // create entities as children of other entities.
  const sun = world.entity("sun").set(position, { x: 0, y: 0 }).add(star);

  //TODO[epic=hierarchies] - ChildOf Relationship
  world
    .entity("mercury")
    .set(position, { x: 10, y: 0 })
    .add(planet)
    .set(world.builtin.ChildOf, sun);

  const venus = world
    .entity("venus")
    .set(position, { x: 20, y: 0 })
    .add(planet)
    .set(world.builtin.ChildOf, sun);

  const earth = world
    .entity("earth")
    .set(position, { x: 30, y: 0 })
    .add(planet)
    .set(world.builtin.ChildOf, sun);

  const luna = world
    .entity("luna")
    .set(position, { x: 40, y: 0 })
    .add(moon)
    .set(world.builtin.ChildOf, earth);

  // Is the Moon a child of Earth?
  expect(moon.has(world.builtin.ChildOf, earth)).toBe(true);

  //TODO[epic=hierarchies] - world.lookup(parent.child) to find children by name
  // Lookup the earth by name
  const e = world.lookupEntity("sun::earth");
  expect(e).toEqual(earth);

  //TODO[epic=hierarchies] - parent.lookup(child)
  // Lookup the moon by name relative
  const l = earth.lookup("luna");
  expect(l).toEqual(luna);

  const list = [] as { name: string; pos: { x: number; y: number } }[];

  // Do a depth-first walk of the tree
  const f = (e: Fiecs.Entity, pos: { x: number; y: number }) => {
    const relative_pos = e.get(position) ?? { x: 0, y: 0 };

    const absolute_pos = {
      x: pos.x + relative_pos.x,
      y: pos.y + relative_pos.y,
    };

    //TODO[epic=hierarchies] - path()
    list.push({ name: e.path(), pos: absolute_pos });
    return absolute_pos;
  };

  iterate_tree(sun, f);

  expect(list).toEqual([
    { name: "sun", pos: { x: 0, y: 0 } },
    { name: "sun::mercury", pos: { x: 10, y: 0 } },
    { name: "sun::venus", pos: { x: 20, y: 0 } },
    { name: "sun::earth", pos: { x: 30, y: 0 } },
    { name: "sun::earth::luna", pos: { x: 70, y: 0 } },
  ]);
});

function iterate_tree(
  e: Fiecs.Entity,
  f: (
    e: Fiecs.Entity,
    pos: { x: number; y: number },
  ) => { x: number; y: number },
  pos = { x: 0, y: 0 },
) {
  const parent_pos = f(e, pos);

  //TODO[epic=hierarchies] - parent() and getChildren()
  e.getChildren().forEach((child) => {
    iterate_tree(child, f, parent_pos);
  });
}
