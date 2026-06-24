import { describe, expect, test } from "vitest";

import * as Fiecs from "../index";

describe("Atomic operations", () => {
  test("When an add operation throws, it does not leave the ECS in a dirty state", () => {
    const world = new Fiecs.World();

    const e = world.entity();
    const target = world.entity("marked target");
    target.add(world.builtin.Target);
    const r = world.tag();

    expect(() => {
      e.add([target, r]);
    }).toThrow(
      'Entity "marked target" is marked as a Target and cannot be used as a relationship',
    );

    expect(world._debugBackendOperationIsDirty()).toBe(false);
  });

  test("When a nested operation fails inside an operation, no changes are made", () => {
    const world = new Fiecs.World();
    const relationshipComponent = world.tag("relationship component");
    relationshipComponent.add(world.builtin.Relationship);

    const tag = world.tag("tag");
    tag.add([world.builtin.With, relationshipComponent]); // this will try to add relationshipComponent as a component, which should throw, but it should not add the With relationship

    const e = world.entity();

    expect(() => e.add(tag)).toThrow(
      'Component "relationship component" is purely a relationship and cannot be used as a component',
    );

    expect(world._debugBackendOperationIsDirty()).toBe(false);
    expect(e.has(tag)).toBe(false);
    expect(e.has(relationshipComponent)).toBe(false);
  });
});
