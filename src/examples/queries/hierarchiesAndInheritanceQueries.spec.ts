import { test } from "vitest";

test.skip("Variables can be the starting point for name-based lookup in builtin parent-child relationships", () => {
  // const world = new Fiecs.World();
  // const spaceship = world.component(z.string());
  // const isPowered = world.tag();
  // // The following query finds all spaceships that have a child
  // // called "cockpit" which is not powered
  // const query = world.query(
  //   spaceship,
  //   Fiecs.not(isPowered).source("$this.cockpit"),
  // );
  // const decadeFalcon = world.entity().set(spaceship, "decade");
  // world.entity("cockpit", decadeFalcon).add(isPowered);
  // const centuryFalcon = world.entity().set(spaceship, "century");
  // world.entity("cockpit", centuryFalcon);
  // const matches = [] as string[];
  // query.each((spaceship) => {
  //   matches.push(`${spaceship.get()}`);
  // });
  // expect(matches).toIncludeSameMembers(["century"]);
});

test.skip(`Relationships can be transitive `, () => {
  // const world = new Fiecs.World();
  // // We can mark a relationship as transitive, which means
  // // that if R(X,Y) and R(Y,Z) then R(X, Z)
  // const locatedIn = world.tag().add(world.builtin.Transitive);
  // const europe = world.entity("europe");
  // const denmark = world.entity("denmark").add([locatedIn, europe]);
  // const copenhagen = world.entity("copenhagen").add([locatedIn, denmark]);
  // world.entity("jens").add([locatedIn, copenhagen]);
  // // this will match denmark, copenhagen, and jens, due to transitivity
  // const query1 = world.query(world.pair(locatedIn, europe));
  // const names = [] as string[];
  // query1.eachWithEntity((e: Fiecs.Entity) => {
  //   names.push(e.getName()!);
  // });
  // expect(names).toIncludeSameMembers(["denmark", "copenhagen"]);
  // // if the second in the pair with a transitive relationship is a variable,
  // // each "level" of the transitivity is matched individually
  // const query2 = world.query(Fiecs.field(world.pair(locatedIn, "$Place")));
  // const strings = [] as string[];
  // query2.eachWithEntity((e: Fiecs.Entity, location) => {
  //   strings.push(
  //     `${e.getName()} is in ${location.getPair()?.second().getName()}`,
  //   );
  // });
  // expect(strings).toIncludeSameMembers([
  //   "jens is in copenhagen",
  //   "jens is in denmark",
  //   "jens is in europe",
  //   "copenhagen is in denmark",
  //   "copenhagen is in europe",
  //   "denmark is in europe",
  // ]);
  // // transitivity can be explicitly disabled on a specific term
  // const query3 = world.query(Fiecs.filter([locatedIn, europe]).nontransitive());
  // const names2 = [] as string[];
  // query3.eachWithEntity((e: Fiecs.Entity) => {
  //   names2.push(e.getName()!);
  // });
  // expect(names2).toIncludeSameMembers(["denmark"]);
});

test.skip(`Relationships can be Reflexive `, () => {
  // const world = new Fiecs.World();
  // // We can mark a relationship as reflexive, meaning it matches itself (R(x,x) is true)
  // const isA = world.tag().add(world.builtin.Reflexive);
  // const tree = world.entity("tree");
  // world.entity("oak").add([isA, tree]);
  // // this will match oak, but it will also match tree, because isA is marked as reflexive
  // const query1 = world.query(world.pair(isA, tree));
  // const names = [] as string[];
  // query1.eachWithEntity((e: Fiecs.Entity) => {
  //   names.push(e.getName()!);
  // });
  // expect(names).toIncludeSameMembers(["tree", "oak"]);
});

// TODO[epic=queries+] - Relationship traversal
// TODO[epic=queries+] - Querying for inherited components

// TODO[epic=queries meh] - AndFrom, OrFrom, NotFrom filters to match against the components of the entity (useful with prefabs)
