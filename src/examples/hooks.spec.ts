import { describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../index";

//TODO[epic=???] - Hooks stuff (not sure if will be implemented)

describe.skip("hooks", () => {
  test.skip("", () => {
    const world = new Fiecs.World();

    const c = world.component(z.number());

    expect(c).toEqual(false);
  });
});
