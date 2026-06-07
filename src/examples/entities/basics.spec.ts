import { expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../../index";

test("basics", () => {
  const world = new Fiecs.World();

  // component with data
  const position = world
    .component(z.object({ x: z.number(), y: z.number() }))
    .setName("position");

  // tag (no data)
  const walking = world.tag("walking");

  // Create an entity with name Bob
  const bob = world
    .entity("Bob")
    // The set operation finds or creates a component, and sets it.
    // Components are automatically registered with the world.
    .set(position, { x: 10, y: 20 })
    // The add operation adds a component without setting a value. This is
    // useful for tags, or when adding a component with its default value.
    .add(walking);

  // Get the value for the Position component
  const pos = bob.get(position);
  expect(pos).toEqual({ x: 10, y: 20 });

  // Overwrite the value of the Position component
  bob.set(position, { x: 15, y: 25 });
  expect(bob.get(position)).toEqual({ x: 15, y: 25 });

  // Create another named entity
  const alice = world.entity("Alice").set(position, { x: 10, y: 20 });

  // Add a tag after entity is created
  alice.add(walking);

  // check type
  expect(alice.type()).toEqual([position, walking]);

  //remove tag
  alice.remove(walking);
  expect(alice.type()).toEqual([position]);

  // Iterate all entities with Position
  const entitiesWithPosition = Array.from(
    world
      .query(position)
      .matches()
      .map(({ entity }) => [entity, entity.get(position)] as const),
  );

  expect(entitiesWithPosition).toIncludeSameMembers([
    [bob, { x: 15, y: 25 }],
    [alice, { x: 10, y: 20 }],
  ]);
});
