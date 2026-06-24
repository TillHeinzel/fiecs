import { describe, expect, test } from "vitest";
import z from "zod";

import { ReadOnly, ReadWrite } from "#/API/Query";
import * as Fiecs from "#/index";

describe("Query variables", () => {
  test("A single variable acts like a wildcard", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.variable("cheese"));

    const notMatched = world.entity("not matched");
    const e1 = world.entity().set(comp, 1);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeAllMembers([
      { entity: e1, match: [] },
    ]);

    expect(Array.from(query.getIteratorWithEntity())).not.toPartiallyContain({
      entity: notMatched,
    });
  });

  test("A Variable populates the corresponding variable in the output", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.variable("cheese"));

    const e1 = world.entity().set(comp, 1);

    expect(
      Array.from(
        Array.from(
          query
            .getIteratorWithVariables()
            .filter(({ variables }) => variables.get("this")!.isSameAs(e1)),
        )[0].variables,
      ),
    ).toIncludeSameMembers([
      ["this", e1],
      ["cheese", comp],
    ]);
  });

  test("[Variable, Entity] populates the corresponding variable in the output ", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number()).setName("comp");
    const entity = world.tag("target");

    const query = world.query([Fiecs.variable("cheese"), entity]);

    world.entity("source").set([comp, entity], 1);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["this", "source"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["cheese", "comp"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeSameMembers([
      ["this", "source"],
      ["cheese", "comp"],
    ]);
  });

  test("[Entity, Variable] populates the corresponding variable in the output ", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number()).setName("comp");
    const entity = world.tag("target");

    const query = world.query([entity, Fiecs.variable("cheese")]);

    world.entity("source").set([entity, comp], 1);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["this", "source"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["cheese", "comp"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeSameMembers([
      ["this", "source"],
      ["cheese", "comp"],
    ]);
  });

  test("[Wildcard, Variable] populates the corresponding variable in the output ", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number()).setName("comp");
    const entity = world.tag("target");

    const query = world.query([world.wildcard, Fiecs.variable("cheese")]);

    world.entity("source").set([entity, comp], 1);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["this", "source"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["cheese", "comp"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeSameMembers([
      ["this", "source"],
      ["cheese", "comp"],
    ]);
  });

  test("[Variable, Wildcard] populates the corresponding variable in the output ", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number()).setName("comp");
    const entity = world.tag("target");

    const query = world.query([Fiecs.variable("cheese"), world.wildcard]);

    world.entity("source").set([comp, entity], 1);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["this", "source"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["cheese", "comp"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeSameMembers([
      ["this", "source"],
      ["cheese", "comp"],
    ]);
  });

  test("[Variable, Variable] populates the corresponding variables in the output ", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number()).setName("comp");
    const entity = world.tag("target");

    const query = world.query([
      Fiecs.variable("cheese"),
      Fiecs.variable("kaeso"),
    ]);

    world.entity("source").set([comp, entity], 1);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([["this", "source"]]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeAllMembers([
      ["cheese", "comp"],
      ["kaeso", "target"],
    ]);

    expect(
      Array.from(Array.from(query.getIteratorWithVariables())[0].variables).map(
        ([n, e]) => [n, e.getName()],
      ),
    ).toIncludeSameMembers([
      ["this", "source"],
      ["cheese", "comp"],
      ["kaeso", "target"],
    ]);
  });

  test("A single variable as target acts like a wildcard", () => {
    const world = new Fiecs.World();

    const comp = world.component(z.number());

    const query = world.query(Fiecs.filter([comp, Fiecs.variable("cheese")]));

    world.entity("not matched");

    const target1 = world.tag();
    const e1 = world.entity().set([comp, target1], 1);

    const target2 = world.tag();
    const e2 = world.entity().set([comp, target1], 10).set([comp, target2], 20);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [] },
      { entity: e2, match: [] },
      { entity: e2, match: [] },
    ]);
  });

  test("A variable set in one term constrains the value in the next term", () => {
    const world = new Fiecs.World();

    const rel = world.tag();

    const query = world.query(
      [rel, Fiecs.variable("cheese")],
      Fiecs.variable("cheese"),
    );

    world.entity("not matched 1");

    const target1 = world.tag();
    // should match because "cheese" should be set to target1 in the first term
    const e1 = world.entity().add([rel, target1]).add(target1);

    const target2 = world.tag();

    // should NOT match because "cheese" should be set to target1 in the first term
    world.entity().add([rel, target1]).add(target2);

    expect(Array.from(query.getIteratorWithEntity())).toIncludeSameMembers([
      { entity: e1, match: [] },
    ]);
  });
});

describe("Query with fixed sources", () => {
  test("We can set a specific entity as source (simple index)", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");

    const e1 = world.entity("e1").set(comp1, 1);
    world.entity("e2").set(comp1, 2);

    expect(() =>
      world.query(Fiecs.field(world.wildcard).source(e1)),
    ).not.toThrow();
  });

  test("A non-this source will pr default return a ReadOnly field", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");

    const e1 = world.entity("e1").set(comp1, 1);
    world.entity("e2").set(comp1, 2);

    const query = world.query(Fiecs.field(world.wildcard).source(e1));

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadOnly(comp1, e1)],
    ]);
  });

  test("A non-this source will pr default return a ReadOnly field", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp1, 2);

    const query = world.query(Fiecs.field(world.wildcard).source(e1));

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadOnly(comp1, e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadOnly(comp1, e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadOnly(comp1, e1)],
    ]);
  });

  test("We can set a specific entity as source (stringlookup pair)", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");
    const target = world.tag("target");

    const e1 = world.entity("e1").set([comp1, target], 1);
    const e2 = world.entity("e2").set([comp1, target], 2);

    const query = world.query(Fiecs.field([comp1, "target"]).source(e1));

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadOnly(world.pair(comp1, target), e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadOnly(world.pair(comp1, target), e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadOnly(world.pair(comp1, target), e1)],
    ]);
  });

  test("We can set a specific entity as source (variable)", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp1, 2);

    const query = world.query(Fiecs.field(Fiecs.variable("hello")).source(e1));

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadOnly(comp1, e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadOnly(comp1, e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadOnly(comp1, e1)],
    ]);
  });

  test("We can set a specific entity as source (variable pair)", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");
    const target = world.tag("target");

    const e1 = world.entity("e1").set([comp1, target], 1);
    const e2 = world.entity("e2").set([comp1, target], 2);

    const query = world.query(
      Fiecs.field([comp1, Fiecs.variable("cheese")]).source(e1),
    );

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadOnly(world.pair(comp1, target), e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadOnly(world.pair(comp1, target), e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadOnly(world.pair(comp1, target), e1)],
    ]);
  });

  test("If we set a name as source that does not exist at query runtime, it will throw on run", () => {
    const world = new Fiecs.World();

    const target = world.tag("target");

    world.entity("e1").add(target);
    world.entity("e2").add(target);

    const query = world.query(Fiecs.field(target).source("doesNotExist"));

    expect(() => query.each(() => {})).toThrow(
      `entity named "doesNotExist" does not exist`,
    );
  });

  test("We can set a name as source and it will find the entity if it exists at query build time", () => {
    const world = new Fiecs.World();

    const comp1 = world.component(z.number()).setName("comp1");

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp1, 2);

    const query = world.query(Fiecs.field(world.wildcard).source("e1"));

    // const arr = Array.from(query.getIterator().map())

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadOnly(comp1, e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadOnly(comp1, e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadOnly(comp1, e1)],
    ]);
  });

  test("We can set a name as source and it will find the entity if it exists at query run time", () => {
    const world = new Fiecs.World();

    const query = world.query(Fiecs.field(world.wildcard).source("e1"));

    const comp1 = world.component(z.number()).setName("comp1");

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp1, 2);

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadOnly(comp1, e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadOnly(comp1, e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadOnly(comp1, e1)],
    ]);
  });

  test("If we specify a source by name, and change the name during query iteration, it will still produce all possible combinations of outcomes", () => {
    const world = new Fiecs.World();

    const q = world.query(
      Fiecs.field(world.wildcard).source("e1"),
      Fiecs.field([world.wildcard, world.wildcard]).source("e1"),
    );

    const tag1 = world.tag("tag1");
    const tag2 = world.tag("tag2");
    const tag3 = world.tag("tag3");

    const e1 = world
      .entity("e1")
      .add(tag1)
      .add([tag2, tag3])
      .add(tag2)
      .add([tag1, tag3]);

    const targets = new Array<string>();

    q.each((x, y) => {
      targets.push(
        `[${x.getComponent()?.getName()}; ${y.getPair()?.getName()}]`,
      );
      e1.setName("not e1");
    });

    expect(targets).toIncludeSameMembers([
      "[tag1; (tag2, tag3)]",
      "[tag1; (tag1, tag3)]",
      "[tag2; (tag2, tag3)]",
      "[tag2; (tag1, tag3)]",
    ]);
  });
});

describe("Query variables and sources mixed", () => {
  test("We can set a (non-this) variable as source", () => {
    const world = new Fiecs.World();

    const trait = world.tag();
    const comp1 = world.component(z.number()).setName("comp1").add(trait);
    const comp2 = world.component(z.number()).setName("comp2");

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp2, 2);

    const query = world.query(
      Fiecs.field("$cheese"),
      Fiecs.filter(trait).source("$cheese"),
    );

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadWrite(comp1, e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadWrite(comp1, e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadWrite(comp1, e1)],
    ]);
  });

  test("We can use a variable set as source in a later term as non-source", () => {
    const world = new Fiecs.World();

    const trait = world.tag();
    const comp1 = world.component(z.number()).setName("comp1").add(trait);
    const comp2 = world.component(z.number()).setName("comp2");

    const e1 = world.entity("e1").set(comp1, 1);
    const e2 = world.entity("e2").set(comp2, 2);

    const query = world.query(
      Fiecs.filter(trait).source("$cheese"),
      Fiecs.field("$cheese"),
    );

    expect(Array.from(query.getIterator())).toIncludeAllMembers([
      [new ReadWrite(comp1, e1)],
    ]);

    expect(Array.from(query.getIterator())).not.toIncludeAnyMembers([
      [new ReadWrite(comp1, e2)],
    ]);

    expect(Array.from(query.getIterator())).toIncludeSameMembers([
      [new ReadWrite(comp1, e1)],
    ]);
  });
});

describe("manually setting query variables", () => {
  test("A new query will have no variables set", () => {
    const world = new Fiecs.World();

    const query = world.query("$cheese");

    expect(query.getVariables()).toEqual(new Map([]));
  });

  test("setting variables creates a new query ", () => {
    const world = new Fiecs.World();

    const query = world.query("$cheese");

    const tag = world.tag();
    const query2 = query.setVariables([["$cheese", tag]]);

    expect(query2).not.toBe(query);
  });

  test("if original query has entity-access, so will the one with set variables", () => {
    const world = new Fiecs.World();

    const query = world.query("$cheese");
    expect(() => query.eachWithEntity(() => {})).not.toThrow();

    const tag = world.tag();
    const query2 = query.setVariables([["$cheese", tag]]);
    expect(() => query2.eachWithEntity(() => {})).not.toThrow();
  });

  test("setting variables makes those variables be returned from getVariables", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query("$cheese").setVariables([["$cheese", tag]]);

    expect(query.getVariables()).toEqual(new Map([["$cheese", tag]]));
  });

  test("setting variables twice merges the variables it makes those variables be returned from getVariables", () => {
    const world = new Fiecs.World();

    const tag1 = world.tag();
    const tag2 = world.tag();

    const query = world
      .query("$cheese1")
      .setVariables([["$cheese1", tag1]])
      .setVariables([["$cheese2", tag2]]);

    expect(query.getVariables()).toEqual(
      new Map([
        ["$cheese1", tag1],
        ["$cheese2", tag2],
      ]),
    );
  });

  test("setting one variable twice overrides it makes those variables be returned from getVariables", () => {
    const world = new Fiecs.World();

    const tag1 = world.tag();
    const tag2 = world.tag();

    const query = world
      .query("$cheese")
      .setVariables([["$cheese", tag1]])
      .setVariables([["$cheese", tag2]]);

    expect(query.getVariables()).toEqual(new Map([["$cheese", tag2]]));
  });

  test("the set variables constrain the results ", () => {
    const world = new Fiecs.World();

    const tag = world.tag();

    const query = world.query("$cheese").setVariables([["$cheese", tag]]);

    const matched = world.entity().add(tag);

    const tag2 = world.tag();
    const notMatched = world.entity("notMatched").add(tag2);

    const matches = new Array<
      [Fiecs.Entity | undefined, Fiecs.Entity | undefined]
    >();

    query.getIteratorWithVariables().forEach(({ variables }) => {
      matches.push([variables.get("this"), variables.get("cheese")]);
    });

    expect(matches).toIncludeSameMembers([[matched, tag]]);
    expect(matches).not.toIncludeAnyMembers([[notMatched, tag2]]);
  });

  test("$this can also be constrained", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const tag2 = world.tag();

    const matched = world.entity().add(tag).add(tag2);
    const notMatched = world.entity("notMatched").add(tag).add(tag2);

    const query = world.query("$cheese").setVariables([
      ["$cheese", tag],
      ["$this", matched],
    ]);

    const matches = new Array<
      [Fiecs.Entity | undefined, Fiecs.Entity | undefined]
    >();

    query.getIteratorWithVariables().forEach(({ variables }) => {
      matches.push([variables.get("this"), variables.get("cheese")]);
    });

    expect(matches).toIncludeSameMembers([[matched, tag]]);
    expect(matches).not.toIncludeAnyMembers([[notMatched, tag]]);
    expect(matches).not.toIncludeAnyMembers([[notMatched, tag2]]);
  });
});
