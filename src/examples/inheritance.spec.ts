import { describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../index";

//TODO[epic=Inheritance] - Define specification for inheritance

describe.skip("Inheritance", () => {
  test.skip("", () => {
    const world = new Fiecs.World();

    const c = world.component(z.number());

    expect(c).toEqual(false);
  });
});

//TODO[epic=Inheritance] - prefabs
//TODO[epic=Inheritance] - IsA Relationship
//TODO[epic=Inheritance] - inheritance-queries https://github.com/SanderMertens/flecs/blob/master/examples/cpp/queries/component_inheritance/src/main.cpp
