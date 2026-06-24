import { describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../index";

describe.skip("get_n set_n", () => {
  test("set_n to set multiple components at once", () => {
    const world = new Fiecs.World();

    const c = world.component(z.number());

    expect(c).toEqual(false);
  });
});
