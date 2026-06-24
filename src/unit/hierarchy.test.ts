import { describe, expect, test } from "vitest";

import * as Fiecs from "../index";

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

    expect(child.has([world.builtin.ChildOf, parent])).toBe(true);
  });

  test(".childOf works with names", () => {
    const world = new Fiecs.World();
    const parent = world.entity("parent");
    const child = world.entity("child").childOf("parent");

    expect(child.has([world.builtin.ChildOf, parent])).toBe(true);
  });

  test(".childOf with non-existent name throws", () => {
    const world = new Fiecs.World();
    world.entity("parent");
    expect(() => world.entity("child").childOf("Not the mommy")).toThrow();
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

  test("Reparenting changes the childs getParent and the parents getChildren", () => {
    const world = new Fiecs.World();
    const parent1 = world.entity("parent1");
    const parent2 = world.entity("parent2");
    const child1 = world.entity("child1").childOf(parent1);
    const child2 = world.entity("child2").childOf(parent1);

    expect(Array.from(parent1.getChildren())).toIncludeSameMembers([
      child1,
      child2,
    ]);
    expect(Array.from(parent2.getChildren())).toIncludeSameMembers([]);
    expect(child1.getParent()).toEqual(parent1);
    expect(child2.getParent()).toEqual(parent1);
    expect(child1.getPath()).toBe("parent1::child1");
    expect(child2.getPath()).toBe("parent1::child2");

    child2.childOf(parent2);

    expect(Array.from(parent1.getChildren())).toIncludeSameMembers([child1]);
    expect(Array.from(parent2.getChildren())).toIncludeSameMembers([child2]);
    expect(child1.getParent()).toEqual(parent1);
    expect(child2.getParent()).toEqual(parent2);
    expect(child1.getPath()).toBe("parent1::child1");
    expect(child2.getPath()).toBe("parent2::child2");
  });

  test("Reparenting through setting relationship changes the childs getParent and the parents getChildren", () => {
    const world = new Fiecs.World();
    const parent1 = world.entity("parent1");
    const parent2 = world.entity("parent2");
    const child1 = world.entity("child1").childOf(parent1);
    const child2 = world.entity("child2").childOf(parent1);

    expect(Array.from(parent1.getChildren())).toIncludeSameMembers([
      child1,
      child2,
    ]);
    expect(Array.from(parent2.getChildren())).toIncludeSameMembers([]);
    expect(child1.getParent()).toEqual(parent1);
    expect(child2.getParent()).toEqual(parent1);
    expect(child1.getPath()).toBe("parent1::child1");
    expect(child2.getPath()).toBe("parent1::child2");

    child2.add([world.builtin.ChildOf, parent2]);

    expect(Array.from(parent1.getChildren())).toIncludeSameMembers([child1]);
    expect(Array.from(parent2.getChildren())).toIncludeSameMembers([child2]);
    expect(child1.getParent()).toEqual(parent1);
    expect(child2.getParent()).toEqual(parent2);
    expect(child1.getPath()).toBe("parent1::child1");
    expect(child2.getPath()).toBe("parent2::child2");
  });

  test("Removing parent changes the childs getParent and the parents getChildren", () => {
    const world = new Fiecs.World();
    const parent = world.entity("parent");
    const child1 = world.entity("child1").childOf(parent);
    const child2 = world.entity("child2").childOf(parent);

    expect(Array.from(parent.getChildren())).toIncludeSameMembers([
      child1,
      child2,
    ]);
    // expect(Array.from(world.getChildren())).not.toIncludeAllMembers([child2]);
    expect(child1.getParent()).toEqual(parent);
    expect(child2.getParent()).toEqual(parent);
    expect(child1.getPath()).toBe("parent::child1");
    expect(child2.getPath()).toBe("parent::child2");

    child2.childOf(undefined);

    expect(Array.from(parent.getChildren())).toIncludeSameMembers([child1]);
    // expect(Array.from(world.getChildren())).toIncludeAllMembers([child2]);
    expect(child1.getParent()).toEqual(parent);
    expect(child2.getParent()).toBeUndefined();
    expect(child1.getPath()).toBe("parent::child1");
    expect(child2.getPath()).toBe("child2");
  });

  test("Removing parent through setting relationship changes the childs getParent and the parents getChildren", () => {
    const world = new Fiecs.World();
    const parent = world.entity("parent");
    const child1 = world.entity("child1").childOf(parent);
    const child2 = world.entity("child2").childOf(parent);

    expect(Array.from(parent.getChildren())).toIncludeSameMembers([
      child1,
      child2,
    ]);
    // expect(Array.from(world.getChildren())).not.toIncludeAllMembers([child2]);
    expect(child1.getParent()).toEqual(parent);
    expect(child2.getParent()).toEqual(parent);
    expect(child1.getPath()).toBe("parent::child1");
    expect(child2.getPath()).toBe("parent::child2");

    child2.remove([world.builtin.ChildOf, parent]);

    expect(Array.from(parent.getChildren())).toIncludeSameMembers([child1]);
    // expect(Array.from(world.getChildren())).toIncludeAllMembers([child2]);
    expect(child1.getParent()).toEqual(parent);
    expect(child2.getParent()).toBeUndefined();
    expect(child1.getPath()).toBe("parent::child1");
    expect(child2.getPath()).toBe("child2");
  });
});

describe("Hierarchical name lookup", () => {
  test("a root entity's path is the same as its name", () => {
    const world = new Fiecs.World();
    const entity = world.entity("entity");

    expect(entity.getPath()).toBe("entity");
  });

  test("an unnamed entity's path is '-unnamed-'", () => {
    const world = new Fiecs.World();
    const entity = world.entity();

    expect(entity.getPath()).toBe("-unnamed-");
  });

  test("an entity with a parent has the parents name first in the path", () => {
    const world = new Fiecs.World();
    const parent = world.entity("parent");
    const child = world.entity("child").childOf(parent);

    expect(child.getPath()).toBe("parent::child");
  });

  test("entity paths include the previous generations up the tree", () => {
    const world = new Fiecs.World();
    const grandparent = world.entity("grandparent");
    const parent = world.entity("parent").childOf(grandparent);
    const child = world.entity("child").childOf(parent);

    expect(grandparent.getPath()).toBe("grandparent");
    expect(parent.getPath()).toBe("grandparent::parent");
    expect(child.getPath()).toBe("grandparent::parent::child");
  });

  test("any entity in the hierachy without a name is called '-unnamed-'", () => {
    const world = new Fiecs.World();
    const grandparent = world.entity("grandparent");
    const parent = world.entity().childOf(grandparent);
    const child = world.entity("child").childOf(parent);

    expect(grandparent.getPath()).toBe("grandparent");
    expect(parent.getPath()).toBe("grandparent::-unnamed-");
    expect(child.getPath()).toBe("grandparent::-unnamed-::child");
  });

  // test("We can lookup a child through its path", () => {
  //   const world = new Fiecs.World();
  //   const parent = world.entity("parent");
  //   const child = world.entity("child").childOf(parent);

  //   const lookup = world.lookupEntity("parent::child");

  //   expect(lookup).toEqual(child);
  // });

  // TODO[epic=hierarchies] - world.lookupEntity("parent::child")
  // TODO[epic=hierarchies] - parent.lookupEntity(child)
  // TODO[epic=hierarchies] - name change must be unique in scope of parent
  // TODO[epic=hierarchies] - reparenting fails if names collide in scope of new parent
  // TODO[epic=hierarchies] - Trying to use world.entity("parent::child") creates both the parent and the child if they don't exist, or looks them up otherwise
});
