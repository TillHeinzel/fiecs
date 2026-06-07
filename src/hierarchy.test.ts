import { describe, expect, test } from "vitest";

import * as Fiecs from "./index";

describe("ChildOf hierarchy", () => {
  test("ChildOf is a trait", () => {
    const world = new Fiecs.World();

    expect(world.builtin.ChildOf.has(world.builtin.Trait)).toBe(true);
  });
  test("ChildOf can only be used as a relationship", () => {
    const world = new Fiecs.World();

    expect(world.builtin.ChildOf.has(world.builtin.Relationship)).toBe(true);
  });
  test("ChildOf is acyclic", () => {
    const world = new Fiecs.World();

    expect(world.builtin.ChildOf.has(world.builtin.Acyclic)).toBe(true);
  });
  test("ChildOf cannot have data", () => {
    const world = new Fiecs.World();

    expect(world.builtin.ChildOf.has(world.builtin.RelationshipHasNoData)).toBe(
      true,
    );
  });
  test("ChildOf is exclusive", () => {
    const world = new Fiecs.World();

    expect(world.builtin.ChildOf.has(world.builtin.Exclusive)).toBe(true);
  });

  test("We can use .childOf as a shortcut to set a ChildOf component", () => {
    const world = new Fiecs.World();
    const parent = world.entity("parent");
    const child = world.entity("child").childOf(parent);

    expect(child.has(world.builtin.ChildOf, parent)).toBe(true);
  });

  test("We can use .getParent as a shortcut to find the parent", () => {
    const world = new Fiecs.World();
    const parent = world.entity("parent");
    const child = world.entity("child").childOf(parent);

    expect(child.getParent()).toEqual(parent);
  });

  test("We can get all the children of a parent with getChildren", () => {
    const world = new Fiecs.World();
    const parent = world.entity("parent");
    const child1 = world.entity("child1").childOf(parent);
    const child2 = world.entity("child2").childOf(parent);

    expect(Array.from(parent.getChildren())).toIncludeSameMembers([
      child1,
      child2,
    ]);
  });

  test.skip("We can get all the root objects by calling getChildren on the world", () => {
    const world = new Fiecs.World();
    const parent1 = world.entity("parent1");
    const child1 = world.entity("child1").childOf(parent1);
    const parent2 = world.entity("parent2");
    const child2 = world.entity("child2").childOf(parent2);

    expect(Array.from(world.getChildren())).toIncludeSameMembers([
      parent1,
      parent2,
    ]);
    expect(Array.from(world.getChildren())).not.toIncludeSameMembers([
      child1,
      child2,
    ]);
  });
});
