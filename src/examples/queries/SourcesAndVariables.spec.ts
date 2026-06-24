import { describe, expect, test } from "vitest";
import z from "zod";

import * as Fiecs from "../../index";

describe("Queries with fixed sources", () => {
  test("We can set a fixed source for terms", () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number());
    const deltaTime = world.component(z.number());
    const paused = world.component(z.boolean());

    const game = world.entity("game").set(deltaTime, 0.01).set(paused, false);

    const isEnabled = world.tag();
    const player = world.entity();
    // query to get position and velocity from the entity, and deltaTime and paused
    // from the game-entity. If game would not have either of those, the query would
    // not match any entities
    const query = world.query(
      position,
      velocity,
      Fiecs.field(deltaTime).source(game),
      Fiecs.field(paused).source("game"), // we can use the name here as well
      Fiecs.filter(isEnabled).source(player), // we can also set source on a filter
    );

    const e = world.entity().set(position, 0).set(velocity, 3);

    player.add(isEnabled);

    let dtSourceName = "";

    query.each((p, v, dt, paused) => {
      // fields with external sources have ReadOnly access pr default,
      // so only get, not set. This can be overwritten by explicitlt
      // setting access modifier
      if (!paused.get()) {
        p.set(p.get() + dt.get() * v.get());
      }

      // we can access the source for a particular field via the wrapper
      dtSourceName = dt.getSource().getName() ?? "";
    });

    expect(dtSourceName).toEqual("game");
    expect(e.get(position)).toEqual(0.03);
  });

  test("We can make queries with only fixed source terms", () => {
    const world = new Fiecs.World();

    const deltaTime = world.component(z.number());
    const bonuses = world.component(z.object({ speedup: z.number() }));
    const withBonus = world.tag();

    const game = world
      .entity("game")
      .set(deltaTime, 0.01)
      .set([withBonus, deltaTime], 0);

    const playerStatus = world.entity().set(bonuses, { speedup: 2 });

    const query = world.query(
      Fiecs.field(deltaTime).source(game),
      Fiecs.writeOnly(world.pair(withBonus, deltaTime)).source(game), // fixed source means ReadOnly pr default
      Fiecs.field(bonuses).source(playerStatus),
    );

    // This will match once if the sources have the required components,
    // otherwise it will not match at all
    query.each((dt, dtWithBonus, bonuses) => {
      dtWithBonus.set(dt.get() * bonuses.get().speedup);
    });

    expect(game.get([withBonus, deltaTime])).toEqual(0.02);

    // The matched entity is not populated on purely fixed-source queries, so these do not work
    expect(() => {
      // @ts-expect-error // this is supposed to not exist on this one
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      query.eachWithEntity(() => {});
    }).toThrow();
    expect(() => {
      // @ts-expect-error // this is supposed to not exist on this one
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      query.getIteratorWithEntity();
    }).toThrow();
  });

  test("Fixed source queries with wildcards may match multiple times", () => {
    const world = new Fiecs.World();

    const resourceStore = world.component(z.number());
    const allResourcesBonus = world.component(z.number());

    const game = world.entity("game").set(allResourcesBonus, 3);

    const player = world.entity();

    // the query does not have to match at query creation, only on iteration
    const query = world.query(
      Fiecs.field(allResourcesBonus).source(game),
      Fiecs.readWrite(world.pair(resourceStore, world.wildcard)).source(player),
    );

    const gold = world.entity();
    const poop = world.entity();

    player.set([resourceStore, gold], 10);
    player.set([resourceStore, poop], 1000);

    // This will match once for each resourceStore
    query.each((bonus, store) => {
      store.set(store.get() + bonus.get());
    });

    expect(player.get([resourceStore, gold])).toEqual(13);
    expect(player.get([resourceStore, poop])).toEqual(1003);
  });
});

describe("Variables in queries", () => {
  test("We can use variables to constrain sources for matches", () => {
    const world = new Fiecs.World();

    const eats = world.entity("eats");
    const isHealthy = world.entity("isHealthy");

    // The following query is to find all (eats, *) pairs
    // that eat a food labelled as isHealthy
    const query = world.query(
      // this looks for (eats, *) pairs on entities,
      // and then populates the variable "food" with the result of the wildcard
      Fiecs.field([eats, Fiecs.variable("food")]),
      // This checks the sources in the variable "food" and filters if they have
      // isHealthy. If not, the match fails and continues with the next food
      Fiecs.filter(isHealthy).source(Fiecs.variable("food")),
    );

    // We can use a shorthand for the variable by supplying a name starting with $
    world.query([eats, "$food"], Fiecs.filter(isHealthy).source("$food"));

    const apples = world.entity("apples").add(isHealthy);
    const pears = world.entity("pears").add(isHealthy);
    const burger = world.entity("burger");
    const pizza = world.entity("pizza");

    world.entity("alice").add([eats, apples]).add([eats, burger]);
    world.entity("bob").add([eats, pears]);
    world.entity("cleo").add([eats, burger]).add([eats, pizza]);

    const matches = [] as string[];

    query.each((eatsPair) => {
      matches.push(
        `${eatsPair.getSource().getName()} eats healthy ${eatsPair.getPair()?.second().getName()}`,
      );
    });

    expect(matches).toIncludeSameMembers([
      "alice eats healthy apples",
      "bob eats healthy pears",
    ]);
  });

  test("The default source is actually a variable called this", () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number());

    // this is the same as query(position, velocity), but with explicit sources
    const query = world.query(
      Fiecs.field(position).source("$this"), // equivalent to just field(position), populates $this
      Fiecs.field(velocity).source("$this"), // further constrains $this for possible matches
    );

    const alice = world.entity("alice").set(position, 0).set(velocity, 5);
    const bob = world.entity("bob").set(position, 0).set(velocity, 3);

    query.each((p, v) => {
      p.set(p.get() + v.get());
    });

    // both move as expected
    expect(alice.get(position)).toBe(5);
    expect(bob.get(position)).toBe(3);

    // But we can do weird shit with this, if we use separate variables

    const query2 = world.query(
      Fiecs.field(position).source("$this"), // same as before
      Fiecs.field(velocity).source("$other"), // does not constrain this, but matches all velocities on any entity
    );

    // matches position on the current matched entity, but velocity from anywhere,
    // so matches separately alice.p + alice.v, alice.p + bob.v, bob.p+alice.v, bob.p+bob.v
    query2.each((p, v) => {
      p.set(p.get() + v.get());
    });

    // the velocities from both alice and bob were matched
    expect(alice.get(position)).toBe(5 + 5 + 3);
    expect(bob.get(position)).toBe(3 + 5 + 3);
  });

  test(`Queries where all sources are other than $this cannot use eachWithEntity 
    or iteratorWithEntity (because entity is populated from $this)`, () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number());

    // queries where all terms have sources that are not $this cannot access the entity
    const query = world.query(
      Fiecs.field(position).source("$some"),
      Fiecs.field(velocity).source("$other"),
    );

    world.entity("alice").set(position, 1).set(velocity, 5);
    world.entity("bob").set(position, 2).set(velocity, 3);

    // .each works as expected with different sources for each component
    // so matching all combinations of position and velocity
    const matches = new Array<string>();
    query.each((p, v) => {
      matches.push(`${p.get()};${v.get()}`);
    });

    expect(matches).toIncludeSameMembers(["1;5", "2;3", "2;5", "1;3"]);

    // trying to access the entity will throw
    expect(() => {
      // @ts-expect-error // this is supposed to not exist on this one
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      query.eachWithEntity(() => {});
    }).toThrow();
    expect(() => {
      // @ts-expect-error // this is supposed to not exist on this one
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      query.getIteratorWithEntity();
    }).toThrow();
  });

  test("A gameplay-ish example for using variables to constrain matches", () => {
    const world = new Fiecs.World();

    const spaceship = world.component(
      z.object({ registry: z.string(), length: z.number() }),
    );
    const isDockedTo = world.tag("isDockedTo");
    const isPlanet = world.tag("isPlanet");

    // finding all spaceships that are docked to location which are planets
    const query = world.query(
      spaceship,
      Fiecs.field([isDockedTo, "$location"]), // the currently checked entity must have (isDockedTo, *), where the result of * populates $location
      Fiecs.filter(isPlanet).source("$location"), // $location must has isPlanet
    );

    const earth = world.entity("earth").add(isPlanet);
    const ds9 = world.entity("ds9"); // not a planet

    world
      .entity("Enterprise-E")
      .set(spaceship, { registry: "NCC-1701-E", length: 685 })
      .add([isDockedTo, earth]);
    world
      .entity("Defiant")
      .set(spaceship, { registry: "NX-74205", length: 120 })
      .add([isDockedTo, ds9]);

    const matches = [] as string[];

    query.each((spaceship, dock) => {
      matches.push(
        `${spaceship.get().registry} is docked at ${dock.getPair()?.second().getName()}`,
      );
    });

    expect(matches).toIncludeSameMembers(["NCC-1701-E is docked at earth"]);
  });

  test("We can manually set variables on queries", () => {
    const world = new Fiecs.World();
    const eats = world.entity("eats");
    const isHealthy = world.entity("isHealthy");

    const query = world.query(
      Fiecs.field([eats, Fiecs.variable("food")]),
      Fiecs.filter(isHealthy).source(Fiecs.variable("food")),
    );

    const apples = world.entity("apples").add(isHealthy);
    const pears = world.entity("pears").add(isHealthy);
    const burger = world.entity("burger");
    const pizza = world.entity("pizza");

    world.entity("alice").add([eats, apples]).add([eats, burger]);
    world.entity("bob").add([eats, pears]);
    world.entity("cleo").add([eats, burger]).add([eats, pizza]);
    {
      const matches = [] as string[];

      // we can create a new query from an existing one by settings some variables.
      query.setVariables([["$food", apples]]).each((eatsPair) => {
        matches.push(
          `${eatsPair.getSource().getName()} eats healthy ${eatsPair.getPair()!.second().getName()}`,
        );
      });

      expect(matches).toIncludeSameMembers([
        "alice eats healthy apples",
        // no bobs pears despite them being healthy
      ]);
    }

    // setting variables does not change the original query
    {
      const matches = [] as string[];

      query.each((eatsPair) => {
        matches.push(
          `${eatsPair.getSource().getName()} eats healthy ${eatsPair.getPair()!.second().getName()}`,
        );
      });

      expect(matches).toIncludeSameMembers([
        "alice eats healthy apples",
        "bob eats healthy pears",
      ]);
    }
  });

  test.skip(`Terms that use variables set by optional terms must be marked dependent`, () => {
    // const world = new Fiecs.World();
    // const spaceship = world.component(
    //   z.object({ registry: z.string(), length: z.number() }),
    // );
    // const isDockedTo = world.tag("isDockedTo");
    // const planet = world.component(z.object({ radius: z.number() }));
    // // finding all spaceships that are docked to location which are planets
    // const query = world.query(
    //   spaceship,
    //   Fiecs.optional(world.pair(isDockedTo, "$location")),
    //   Fiecs.dependent(planet).source("$location"), // must be dependent or a filter, otherwise throws
    // );
    // const earth = world.entity("Earth").set(planet, { radius: 6378 });
    // const ds9 = world.entity("Deep Space 9"); // not a planet
    // world
    //   .entity("Enterprise-E")
    //   .set(spaceship, { registry: "NCC-1701-E", length: 685 })
    //   .add([isDockedTo, earth]);
    // world
    //   .entity("Defiant")
    //   .set(spaceship, { registry: "NX-74205", length: 120 })
    //   .add([isDockedTo, ds9]);
    // const matches = [] as string[];
    // query.each((spaceship, dock, planet) => {
    //   if (dock !== undefined && planet !== undefined) {
    //     matches.push(
    //       `${spaceship.get().registry} is docked to planet ${dock.getPair()?.second().getName()} with radius ${planet.get()?.radius}`,
    //     );
    //   } else {
    //     matches.push(`${spaceship.get().registry} is not docked at a planet`);
    //   }
    // });
    // expect(matches).toIncludeSameMembers([
    //   "NCC-1701-E is docked at planet Earth with radius 6378",
    //   "NX-74205 is not docked at a planet",
    // ]);
  });

  test.skip(`Terms that use variables set by subterms of oneOf terms must be marked dependent themselves`, () => {});

  test.skip("not-filters cannot set variables, because they don't match anything to populate the variable with", () => {
    const world = new Fiecs.World();

    const eats = world.entity("eats");
    const produces = world.entity("produces");

    const apples = world.entity("apples");
    const pears = world.entity("pears");

    world.entity("alice").add([eats, apples]);
    world.entity("bob").add([eats, pears]).add([produces, apples]);
    world.entity("cleo").add([eats, apples]).add([produces, apples]);

    // not-terms work fine with variables in queries like this, where the value of the
    // variables is set by another term before it
    {
      const query = world.query(
        Fiecs.field([eats, "$food"]),
        Fiecs.not([produces, "$food"]),
      );

      const matches = [] as string[];

      query.each((eatsPair) => {
        matches.push(
          `${eatsPair.getSource().getName()} eats, but does not produce ${eatsPair.getPair()?.second().getName()}`,
        );
      });

      expect(matches).toIncludeSameMembers([
        "alice eats, but does not produce apples",
        "bob eats, but does not produce pears",
      ]);
    }

    // not-terms do NOT work if they need to populate a variable, because they don't
    // really match anything, they just filter matches
    {
      expect(() => world.query(Fiecs.not([produces, "$food"]))).toThrow(
        "Not-filter cannot set (non-source) variables",
      );
    }
  });

  test("variables can be used on the component-level as well", () => {
    const world = new Fiecs.World();

    const someTrait = world.tag("someTrait");

    // matches all entities that have a component which has the someTrait-tag
    const query = world.query(
      Fiecs.field(Fiecs.variable("component")),
      Fiecs.filter(someTrait).source(Fiecs.variable("component")),
    );

    const comp1 = world.component(z.number()).add(someTrait);
    const comp2 = world.component(z.string()).add(someTrait);

    world.entity().set(comp1, 1);
    world.entity().set(comp1, 3).set(comp2, "hello");

    const matches = [] as string[];

    query.each((val) => {
      matches.push(JSON.stringify(val.get()));
    });

    expect(matches).toIncludeSameMembers(["1", "3", '"hello"']);
  });
});

// TODO[epic=queries] - Terms using a variable set by an optional term must be marked dependent
// TODO[epic=queries] - Terms using a variable set by a subterm of a oneOf must be marked dependent

// TODO[epic=queries meh] - Equality operator to check if variable equals specific entity
// TODO[epic=queries meh] - Equality operator to check if variable equals entity with specific name
// TODO[epic=queries meh] - Inequality operator to check if variable inequals specific entity
// TODO[epic=queries meh] - Inequality operator to check if variable inequals entity with specific name
// TODO[epic=queries meh] - partial match operator if entity from variable has name with substring
