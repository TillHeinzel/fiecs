import { describe, expect, test } from "vitest";
import { z } from "zod";

import * as Fiecs from "../index";

//TODO[epic=Systems] - Define spec for systems

describe.skip("Systems", () => {
  test.skip("", () => {
    const world = new Fiecs.World();

    const c = world.component(z.number());

    expect(c).toEqual(false);
  });
});
