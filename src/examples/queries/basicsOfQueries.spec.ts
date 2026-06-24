import { describe, expect, test } from "vitest";
import z from "zod";

import * as Fiecs from "../../index";

describe("Basic Queries for components and tags", () => {
  test("We can query for a single component", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    // we can create a query for the registered component position
    const query = world.query(position);

    const entity = world.entity().set(position, { x: 1, y: 1 });

    // we can use each to iterate all matched combinations of components
    let text = "";
    let matchedCount = 0;
    query.each((position) => {
      matchedCount++;
      // we can read the data from position
      text = JSON.stringify(position.get());

      // we can also write to it
      position.set({ x: 10, y: 10 });
    });
    expect(matchedCount).toBe(1);
    expect(text).toEqual('{"x":1,"y":1}');
    expect(entity.get(position)).toEqual({ x: 10, y: 10 });
  });

  test("We can also query and get the matched entity as well", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const strength = world.component(z.number());

    const query = world.query(position);
    const entity = world
      .entity("bob")
      .set(position, { x: 0, y: 0 })
      .set(strength, 1);

    // The entity is put before the matched component (s)
    // (some fancy advanced queries cannot use this for reasons)
    let text = "";
    query.eachWithEntity((entity, position) => {
      // we can access properties on the entity
      text = entity.getName() + " is at " + JSON.stringify(position.get());

      // we can set other components on the entity, as long as they are not added
      entity.set(strength, 3);
    });
    expect(text).toEqual('bob is at {"x":0,"y":0}');
    expect(entity.get(strength)).toBe(3);
  });

  test("We can NOT add or remove components during query iteration (can be worked around with deferred operations)", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    const query = world.query(position);
    const entity = world.entity("bob").set(position, { x: 0, y: 0 });

    // The entity is put before the matched component (s)
    // (some fancy advanced queries cannot use this for reasons)
    const isPretty = world.tag();
    query.eachWithEntity((entity) => {
      // We cannot add or remove components, because that could lead to moving
      // entities between tables, which would be like changing an array while
      // iterating it and lead to all kinds of weirdness. This can be resolved
      // (see below somewhere) with deferred operations.
      // Iterating by using the getIterators APIs does NOT have this safety.
      // you're on your own there.
      expect(() => entity.add(isPretty)).toThrow("Tables locked");
      expect(() => entity.remove(position)).toThrow("Tables locked");
    });

    expect(entity.has(isPretty)).toBe(false);
    expect(entity.has(position)).toBe(true);
  });

  test("The iterator APIs do not have the table locking safety feature, but you can activate it manually", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    const query = world.query(position);
    const entity = world.entity("bob").set(position, { x: 0, y: 0 });

    const isPretty = world.tag();
    world.lockTables();
    query.getIteratorWithEntity().forEach(({ entity }) => {
      expect(() => entity.add(isPretty)).toThrow("Tables locked");
      expect(() => entity.remove(position)).toThrow("Tables locked");
    });
    world.unlockTables();

    expect(entity.has(isPretty)).toBe(false);
    expect(entity.has(position)).toBe(true);
  });

  test("We can also get a standard TS iterator over matches", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    const query = world.query(position);

    const entity = world.entity("bob").set(position, { x: 0, y: 0 });

    let text = "";
    // we can get an iterator
    query.getIterator().forEach(([position]) => {
      text = JSON.stringify(position.get());
      position.set({ x: 10, y: 10 });
    });
    expect(text).toEqual('{"x":0,"y":0}');
    expect(entity.get(position)).toEqual({ x: 10, y: 10 });
  });

  test("We can also get a standard TS iterator with entity", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    const query = world.query(position);

    const entity = world.entity("bob").set(position, { x: 0, y: 0 });

    let text = "";
    // we can get an iterator
    query.getIteratorWithEntity().forEach(({ match: [position], entity }) => {
      text = entity.getName() + " is at " + JSON.stringify(position.get());
      position.set({ x: 10, y: 10 });
    });
    expect(text).toEqual('bob is at {"x":0,"y":0}');
    expect(entity.get(position)).toEqual({ x: 10, y: 10 });
  });

  test("We can query for multiple components at once", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const velocity = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    const query = world.query(position, velocity);

    const entity = world
      .entity()
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    query.each((position, velocity) => {
      const p = position.get();
      const v = velocity.get();
      position.set({ x: p.x + v.x, y: p.y + v.y });
    });

    expect(entity.get(position)).toEqual({ x: 15, y: 14 });
  });

  test("We can label a component as a filter, so it will filter the matches without being returned", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const velocity = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    // get the velocities of all entities that also have a position, but do not access the position
    const query = world.query(Fiecs.filter(position), velocity);

    const entity = world
      .entity()
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    const nonMatchedEntity = world.entity().set(velocity, { x: -10, y: -20 });

    // the filter is not accessed in the iteration
    query.each((velocity) => {
      velocity.set({ x: 0, y: 0 });
    });

    // but the filter still constrains which entities are affected
    expect(entity.get(velocity)).toEqual({ x: 0, y: 0 });
    expect(nonMatchedEntity.get(velocity)).toEqual({ x: -10, y: -20 });
  });

  test("We can also query with a tag, which will be automatically treated as a filter", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const velocity = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );

    const isAllowedToMove = world.tag();
    // tags are just entities, so this is equivalent to
    // const isAllowedToMove = world.entity();

    // get the velocities of all entities that are allowed to move
    const query = world.query(isAllowedToMove, position, velocity);

    const matchedEntity = world
      .entity()
      .add(isAllowedToMove)
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    const nonMatchedEntity = world
      .entity()
      .set(position, { x: 0, y: 0 })
      .set(velocity, { x: -10, y: -20 });

    // The tag is not part of the matched components, but still constrains matched entities
    query.each((position, velocity) => {
      const p = position.get();
      const v = velocity.get();

      position.set({ x: p.x + v.x, y: p.y + v.y });
    });

    expect(matchedEntity.get(position)).toEqual({ x: 15, y: 14 });
    expect(nonMatchedEntity.get(position)).toEqual({ x: 0, y: 0 });
  });

  test("We can treat a tag as a field as well, but type information is then lost", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const velocity = world
      .component(z.object({ x: z.number(), y: z.number() }))
      .setName("velocity");

    // this is interpreted as an entity, because we do not know the type of the component-operation
    const unTypedVelocity = world.lookupEntity("velocity")!;

    const query = world.query(position, Fiecs.field(unTypedVelocity));

    const entity = world
      .entity()
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    // fields are part of the interface
    query.each((position, velocity) => {
      const p = position.get();
      // we need to manually add the type information here
      const v = velocity.get() as { x: number; y: number };

      position.set({ x: p.x + v.x, y: p.y + v.y });
    });

    expect(entity.get(position)).toEqual({ x: 15, y: 14 });
  });

  test("filter and field functions are shorthand for the more general term-function", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const velocity = world
      .component(z.object({ x: z.number(), y: z.number() }))
      .setName("velocity");

    const unTypedVelocity = world.lookupEntity("velocity")!;

    // here position will be considered a field, while velocity will be a filter
    const query = world.query(
      Fiecs.term(position),
      Fiecs.term(unTypedVelocity),
    );

    world.entity("notMatched").set(position, { x: 5, y: 4 });

    const entity = world
      .entity()
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    // fields are part of the interface
    query.each((position) => {
      const p = position.get();

      position.set({ x: p.x + 1, y: p.y + 2 });
    });

    expect(entity.get(position)).toEqual({ x: 6, y: 6 });
  });

  test("We can manually add type information for a field", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const velocity = world
      .component(z.object({ x: z.number(), y: z.number() }))
      .setName("velocity");

    // this is interpreted as an entity, because we do not know the type of the component-operation
    const unTypedVelocity = world.lookupEntity("velocity")!;

    const query = world.query(
      position,
      Fiecs.field<{ x: number; y: number }>(unTypedVelocity),
    );

    const entity = world
      .entity()
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    query.each((position, velocity) => {
      const p = position.get();
      // no need to cast
      const v = velocity.get();

      position.set({ x: p.x + v.x, y: p.y + v.y });
    });

    expect(entity.get(position)).toEqual({ x: 15, y: 14 });
  });

  test("We can also just straight up query by component name (treated as a filter by default, not a field)", () => {
    const world = new Fiecs.World();

    const position = world.component(
      z.object({ x: z.number(), y: z.number() }),
    );
    const velocity = world
      .component(z.object({ x: z.number(), y: z.number() }))
      .setName("velocity");

    const isAllowedToMove = world.tag("isAllowedToMove");

    const query = world.query(
      "isAllowedToMove",
      position,
      Fiecs.field<{ x: number; y: number }>("velocity"),
    );

    const matchedEntity = world
      .entity()
      .add(isAllowedToMove)
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    const nonMatchedEntity = world
      .entity()
      .set(position, { x: 5, y: 4 })
      .set(velocity, { x: 10, y: 10 });

    // isAllowedToMove is not part of the matched components, but still filters,
    // velocity is there with out defined type
    query.each((position, velocity) => {
      const p = position.get();
      const v = velocity.get();

      position.set({ x: p.x + v.x, y: p.y + v.y });
    });

    expect(matchedEntity.get(position)).toEqual({ x: 15, y: 14 });
    expect(nonMatchedEntity.get(position)).toEqual({ x: 5, y: 4 }); // did not move
  });

  test("Pairs work just like components, if they have known data, they are treated as fields, without it they are treated as filters, unless explicity stated otherwise", () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number()).setName("velocity");

    const acceleration = world.component(z.number());
    const xDir = world.entity("xDir");

    const isAllowedToMove = world.tag();

    // get the velocity as an entity
    const untypedVelocity = world.entity("velocity");
    expect(untypedVelocity).toEqual(velocity);

    // Query for the x-position and x-velocity of all entities that are allowed to
    // move in x-dir and have an acceleration in x-direction, but do not access the
    // acceleration, even though it has data. Works the same if the data comes from the
    // target instead of the relationship.
    const query = world.query(
      world.pair(isAllowedToMove, xDir),
      [position, xDir], // can put in pairs like this as well
      Fiecs.filter(world.pair(acceleration, xDir)), // two arguments are treated as pair
      Fiecs.field<number>(world.pair(untypedVelocity, xDir)),
    );

    const matchedEntity = world
      .entity()
      .add([isAllowedToMove, xDir])
      .set([position, xDir], 0)
      .set([velocity, xDir], 5)
      .set([acceleration, xDir], 1);

    // lacks acceleration
    const nonMatchedEntity = world
      .entity()
      .add([isAllowedToMove, xDir])
      .set([position, xDir], 0)
      .set([velocity, xDir], 5);

    // lacks isAllowedToMove
    const nonMatchedEntity2 = world
      .entity()
      .set([position, xDir], 0)
      .set([velocity, xDir], 5)
      .set([acceleration, xDir], 1);

    // isAllowedToMove is not part of the matched components, but still filters,
    // velocity is there with out defined type
    query.each((position, velocity) => {
      position.set(position.get() + velocity.get());
    });

    expect(matchedEntity.get([position, xDir])).toEqual(5);
    expect(nonMatchedEntity.get([position, xDir])).toEqual(0);
    expect(nonMatchedEntity2.get([position, xDir])).toEqual(0);
  });

  test("We can exclude certain things with the not-operator", () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number());
    const frozen = world.tag();

    // query positin and velocity for all non-frozen entities.
    const query = world.query(
      position,
      velocity,
      Fiecs.not(frozen), // not-terms are always filters and cannot be turned to fields, because they don't actually match anything specific
    );

    const matchedEntity = world.entity().set(position, 0).set(velocity, 5);

    const nonMatchedEntity = world
      .entity()
      .set(position, 0)
      .set(velocity, 5)
      .add(frozen);

    query.each((position, velocity) => {
      position.set(position.get() + velocity.get());
    });

    expect(matchedEntity.get(position)).toEqual(5);
    expect(nonMatchedEntity.get(position)).toEqual(0);
  });

  test("We can add optional parameters", () => {
    const world = new Fiecs.World();
    const position = world.component(z.number());
    const velocity = world.component(z.number());
    const acceleration = world.component(z.number());

    // query position and velocity and acceleration if its there
    const query = world.query(
      position,
      velocity,
      // optional terms are always fields,
      // and cannot be filters, because they don't constrain anything.
      // they are readonly by default
      Fiecs.optional(acceleration),
    );

    const withCaffeine = world
      .entity()
      .set(position, 2)
      .set(velocity, 5)
      .set(acceleration, 3);

    const withoutCaffeine = world.entity().set(position, 2).set(velocity, 5);

    // a.get()  will be number | undefined
    query.each((p, v, a) => {
      const acc = a.get();
      if (acc !== undefined) {
        v.set(v.get() + acc);
      }
      p.set(p.get() + v.get());
    });

    expect(withCaffeine.get(position)).toEqual(2 + 5 + 3);
    expect(withCaffeine.get(velocity)).toEqual(5 + 3);

    expect(withoutCaffeine.get(position)).toEqual(2 + 5);
    expect(withoutCaffeine.get(velocity)).toEqual(5);
  });
});

describe("Queries with wildcards", () => {
  test(`Querying for wildcard-pairs works similarly: if we know that there is data and what 
    type the data is, the term is treated like a field, otherwise it's treated as a 
    filter unless otherwise specified by user.`, () => {
    const world = new Fiecs.World();

    const collects = world.component(z.number());
    const putsIn = world.tag();

    const query = world.query(
      world.pair(collects, world.wildcard), // (component, *) -> has type of component -> field
      Fiecs.field(world.pair(putsIn, world.wildcard)), // (tag, *) manually set to field, but data type unpredictable, so handled in user code
    );

    const apples = world.entity();
    const pears = world.entity();

    const basket = world.component(
      z.object({
        val: z.number(),
      }),
    );
    const bucket = world.component(z.number());

    const alice = world
      .entity()
      .set([collects, apples], 5)
      .set([putsIn, basket], { val: 0 });

    const bob = world
      .entity()
      .set([collects, apples], 6)
      .set([collects, pears], 14)
      .set([putsIn, basket], { val: 0 })
      .set([putsIn, bucket], 0);

    const mouth = world.entity();
    // const clive =
    world.entity().set([collects, apples], 7).add([putsIn, mouth]);

    let lost = 0;

    query.each((collects, container) => {
      // the accessors have a type predicate to check and constrain them
      if (container.isSameAs(world.pair(putsIn, basket))) {
        container.set({ val: container.get().val + collects.get() });
      } else if (container.isSameAs(world.pair(putsIn, bucket))) {
        container.set(container.get() + collects.get());
      } else {
        lost += collects.get();
      }
    });

    expect(alice.get([putsIn, basket])!.val).toEqual(5);
    // the one query matches bob for both (collect, apples) and (collects, pears).
    expect(bob.get([putsIn, bucket])).toEqual(6 + 14);
    // this is a potential danger of multiple wildcard, as all possible combinations
    // are matched, so both the basket and the bucket get filled (the same amount),
    // which would probably be a bug
    expect(bob.get([putsIn, basket])?.val).toEqual(6 + 14);

    // clive gets matched, but his apples just get eaten :(
    expect(lost).toBe(7);
  });

  test(`We can use the oneOf operator to keep clive from just eating the apples`, () => {
    const world = new Fiecs.World();
    const collects = world.component(z.number());
    const putsIn = world.tag();
    const basket = world.component(
      z.object({
        val: z.number(),
      }),
    );
    const bucket = world.component(z.number());

    const query = world.query(
      world.pair(collects, world.wildcard),
      // This is a field, because both subterms are fields.
      // if both subterms were filters, it would be a filter
      // you can't mix filters and fields. All must be the same for a single oneOf
      Fiecs.oneOf(world.pair(putsIn, basket), world.pair(putsIn, bucket)),
    );

    // oneOf also works with components, tags, etc.
    const apples = world.entity();
    const pears = world.entity();

    const alice = world
      .entity()
      .set([collects, apples], 5)
      .set([putsIn, basket], { val: 0 });

    const bob = world
      .entity()
      .set([collects, apples], 6)
      .set([collects, pears], 14)
      .set([putsIn, basket], { val: 0 })
      .set([putsIn, bucket], 0);
    const mouth = world.entity();

    world.entity("clive").set([collects, apples], 7).add([putsIn, mouth]);

    let lost = 0;

    // Here container.get() will return  {val: number} | number
    query.each((collects, container) => {
      if (container.isSameAs(world.pair(putsIn, basket))) {
        container.set({ val: container.get().val + collects.get() });
      } else if (container.isSameAs(world.pair(putsIn, bucket))) {
        container.set(container.get() + collects.get());
      } else {
        // this now never happens, because clive does not get matched
        lost += collects.get();
      }
    });
    expect(alice.get([putsIn, basket])!.val).toEqual(5);
    expect(bob.get([putsIn, bucket])).toEqual(6 + 14);
    // the two-store bug still happens
    expect(bob.get([putsIn, basket])).toEqual({ val: 6 + 14 });
    // clive does not get matched, so he end up not eating any apples!
    expect(lost).toBe(0);
  });

  test(`Target-queries (*, target) are always treated as filters, because we cannot know 
        the type beforehand (even if target is a component), and otherwise work the same as everything else`, () => {
    const world = new Fiecs.World();

    const apples = world.entity();

    const query = world.query(Fiecs.field(world.pair(world.wildcard, apples)));

    const likes = world.tag();
    world.entity("jack").add([likes, apples]);

    const grows = world.tag();
    world.entity("tree").add([grows, apples]);

    const poops = world.component(z.number());
    world.entity("horse").set([poops, apples], 5000);

    let matches = 0;
    let poopies = 0;
    query.each((smthgWithApples) => {
      matches += 1;
      if (smthgWithApples.getPair()?.hasData()) {
        poopies += 1;
      }
    });

    expect(matches).toBe(3);
    expect(poopies).toBe(1);
  });

  test(`Plain wildcard queries are treated as fields by default, because they barely
         constrain anything, but there are probably not a lot of actual use-cases for these
         kinds of query. You can do it though. Things get weird`, () => {
    // const world = new Fiecs.World();
    // const collect = world.component(z.array(z.string())).setName("collect");
    // const query = world.query2(
    //   collect,
    //   world.wildcard, // field matching any , but with an unknown type
    //   world.pair(world.wildcard, world.wildcard), // also field, with unknown type
    // );
    // const isThirsty = world.tag("isThirsty");
    // const eats = world.entity("eats");
    // const apples = world.entity("apples");
    // const pears = world.entity("pears");
    // const alice = world
    //   .entity()
    //   .set(collect, [])
    //   .add(isThirsty)
    //   .add([eats, apples])
    //   .add([eats, pears]);
    // // even though collect is matched in the first term, it is also matched by the wildcard
    // // in the second term.
    // query.each((collect, someMatch, somePair) => {
    //   collect.set([
    //     ...collect.get(),
    //     `${someMatch.getComponent()?.getName()}|(${somePair.getPair()?.first().getName()},${somePair.getPair()?.second().getName()})`,
    //   ]);
    // });
    // expect(alice.get(collect)).toIncludeSameMembers([
    //   "collect|(eats,apples)",
    //   "collect|(eats,pears)",
    //   "isThirsty|(eats,apples)",
    //   "isThirsty|(eats,pears)",
    // ]);
  });
});

describe("Access modifiers", () => {
  test(`We can explicitly set the access modifiers for field-terms, which modifies which accessors the wrapper can have on iteration`, () => {
    const world = new Fiecs.World();

    const position = world.component(z.number());
    const velocity = world.component(z.number());
    const acceleration = world.component(z.number());
    const cached = world.tag();

    //
    // "ReadWrite"  | Fiecs.readWrite()      | field(...).readWrite()    | get and set
    // "ReadOnly"   | Fiecs.readOnly()       | field(...).readOnly()     | get
    // "WriteOnly"  | Fiecs.writeOnly()      | field(...).writeOnly()    | set
    // "NoAccess"   | Fiecs.noAccess()       | field(...).noAccess()     | neither
    // "FilterOnly" | Fiecs.filter()       | field(...).filterOnly()   | not part of the interface
    // "Default"    | Fiecs.defaultAccess()  |field(...).defaultAccess() |
    //
    // default is normally ReadWrite, but sometimes its ReadOnly,
    // when the source of the field is not the matched entity itself,
    // to encourage keeping changes "local" to the currently matched entity.

    world
      .entity()
      .set(position, 0)
      .set(velocity, 3)
      .set(acceleration, 2)
      .set([cached, velocity], 0);

    let hasCorrectAccessors = false;

    world
      .query(
        Fiecs.field(position).access("ReadWrite"),
        Fiecs.noAccess(velocity), // short for Fiecs.field(velocity).access("in")
        Fiecs.field(acceleration).readOnly(), //
        Fiecs.writeOnly(world.pair(cached, velocity)),
      )
      .eachWithEntity((e, p, v, a, cache) => {
        // NoAccess can still access the underlying component,
        // but we'll have to fiddle to get the type
        const vComp = v.getComponent()!.asComponent<number>()!;

        const velocity = e.get(vComp)!;

        // p has get and set
        p.set(p.get() + velocity);

        // the velocity cache has set
        cache.set(velocity);

        // acceleration has get
        e.set(vComp, velocity + a.get());

        const rp = p.hasGet() && p.hasSet();
        const rv = !v.hasGet() && !v.hasSet();
        const ra = a.hasGet() && !a.hasSet();
        const rh = !cache.hasGet() && cache.hasSet();

        hasCorrectAccessors = rp && rv && ra && rh;
      });

    expect(hasCorrectAccessors).toBe(true);
  });
});

// TODO[epic=queries] - dependent terms

// TODO[epic=queries] - cached queries with variables manually set should give correct results

// TODO[epic=queries meh] - Scoped filters that allow subqueries to be used as filter
// TODO[epic=queries meh] - complex operators as filters: and, or, not, arbitrarily nested but only as filters

// TODO[epic=queries meh] - Member value queries
// TODO[epic=queries meh] - Sorting & grouping

// TODO[epic=queries meh] - Cyclic variables https://github.com/SanderMertens/flecs/blob/master/examples/cpp/queries/cyclic_variables/src/main.cpp
